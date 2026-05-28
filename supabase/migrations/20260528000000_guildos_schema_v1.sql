-- ═══════════════════════════════════════════════
-- GuildOS Database Schema v1.0
-- ═══════════════════════════════════════════════

-- Drop old trigger/function from any prior schema so this migration is idempotent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.set_updated_at();
DROP FUNCTION IF EXISTS public.is_community_admin(uuid);

-- Drop old tables (order respects FK constraints)
DROP TABLE IF EXISTS public.leads              CASCADE;
DROP TABLE IF EXISTS public.activity_feed      CASCADE;
DROP TABLE IF EXISTS public.teams              CASCADE;
DROP TABLE IF EXISTS public.match_requests     CASCADE;
DROP TABLE IF EXISTS public.flagged_posts      CASCADE;
DROP TABLE IF EXISTS public.members            CASCADE;
DROP TABLE IF EXISTS public.communities        CASCADE;
DROP TABLE IF EXISTS public.profiles           CASCADE;

-- ─────────────────────────────────────────────
-- 1. communities
-- ─────────────────────────────────────────────
CREATE TABLE communities (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  platform          VARCHAR(20)  NOT NULL,          -- facebook / discord / line
  platform_group_id VARCHAR(100) NOT NULL UNIQUE,   -- ID of group on the source platform
  admin_user_id     UUID,                            -- FK → users.id (added after users table)
  admin_auth_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- GuildOS dashboard admin
  subscription_tier VARCHAR(20)  DEFAULT 'free',
  total_members     INTEGER      DEFAULT 0,
  last_synced_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ  DEFAULT NOW(),
  is_active         BOOLEAN      DEFAULT true,
  is_onboarded      BOOLEAN      DEFAULT false       -- dashboard onboarding gate
);

-- ─────────────────────────────────────────────
-- 2. users  (platform identities from Discord / Facebook / LINE)
-- ─────────────────────────────────────────────
CREATE TABLE users (
  id                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name         VARCHAR(100) NOT NULL,
  platform_user_id     VARCHAR(100) NOT NULL UNIQUE,
  platform_type        VARCHAR(20)  NOT NULL,
  warning_count        SMALLINT     DEFAULT 0,
  status               VARCHAR(20)  DEFAULT 'active',  -- active / warned / muted / banned
  onboarding_completed BOOLEAN      DEFAULT false,
  created_at           TIMESTAMPTZ  DEFAULT NOW(),
  last_active_at       TIMESTAMPTZ
);

-- Add FK now that users exists
ALTER TABLE communities
  ADD CONSTRAINT communities_admin_user_id_fkey
  FOREIGN KEY (admin_user_id) REFERENCES users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────
-- 3. community_members
-- ─────────────────────────────────────────────
CREATE TABLE community_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID        REFERENCES communities(id) ON DELETE CASCADE,
  user_id      UUID        REFERENCES users(id)       ON DELETE CASCADE,
  role         VARCHAR(20) DEFAULT 'member',
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  is_active    BOOLEAN     DEFAULT true,
  UNIQUE(community_id, user_id)
);

-- ─────────────────────────────────────────────
-- 4. skill_cards
-- ─────────────────────────────────────────────
CREATE TABLE skill_cards (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES users(id)       UNIQUE,
  community_id   UUID        REFERENCES communities(id),
  game           VARCHAR(50) NOT NULL,
  role           VARCHAR(50) NOT NULL,
  available_time JSONB       NOT NULL,
  time_vector    JSONB,
  play_style     VARCHAR(20) NOT NULL,
  style_vector   JSONB,
  goal           VARCHAR(30) NOT NULL,
  rank           VARCHAR(30),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 5. posts
-- ─────────────────────────────────────────────
CREATE TABLE posts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID        REFERENCES communities(id) NOT NULL,
  user_id          UUID        REFERENCES users(id)       NOT NULL,
  platform_post_id VARCHAR(100) UNIQUE,
  content_type     VARCHAR(20) NOT NULL,   -- post / comment / reply
  content_preview  TEXT,
  is_blocked       BOOLEAN     DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_posts_community_time ON posts(community_id, created_at DESC);

-- ─────────────────────────────────────────────
-- 6. moderation_logs  (written by AI service via service_role)
-- ─────────────────────────────────────────────
CREATE TABLE moderation_logs (
  id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id     UUID           REFERENCES communities(id) NOT NULL,
  post_id          UUID           REFERENCES posts(id)       NOT NULL,
  user_id          UUID           REFERENCES users(id)       NOT NULL,
  label            VARCHAR(30)    NOT NULL,             -- spam / toxic / sell_id / normal
  confidence_score NUMERIC(4,3)   NOT NULL,
  model_version    VARCHAR(30)    NOT NULL,
  action_taken     VARCHAR(20)    NOT NULL,             -- remove / warn / mute / pass
  threshold_used   NUMERIC(4,3)   NOT NULL,
  requires_review  BOOLEAN        DEFAULT false,
  created_at       TIMESTAMPTZ    DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 7. human_reviews
-- ─────────────────────────────────────────────
CREATE TABLE human_reviews (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_log_id  UUID        REFERENCES moderation_logs(id) UNIQUE,
  reviewer_id        UUID        REFERENCES users(id),
  decision           VARCHAR(20),    -- confirm / override / ignore
  note               TEXT,
  reviewed_at        TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 8. matches
-- ─────────────────────────────────────────────
CREATE TABLE matches (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id    UUID          REFERENCES communities(id) NOT NULL,
  requester_id    UUID          REFERENCES users(id)       NOT NULL,
  matched_user_id UUID          REFERENCES users(id)       NOT NULL,
  game            VARCHAR(50)   NOT NULL,
  match_score     NUMERIC(5,3)  NOT NULL,
  game_score      NUMERIC(5,3)  NOT NULL,
  time_score      NUMERIC(5,3)  NOT NULL,
  role_score      NUMERIC(5,3)  NOT NULL,
  style_score     NUMERIC(5,3)  NOT NULL,
  status          VARCHAR(20)   DEFAULT 'pending',   -- pending / accepted / rejected / expired
  requested_at    TIMESTAMPTZ   DEFAULT NOW(),
  responded_at    TIMESTAMPTZ
);
CREATE INDEX idx_matches_community ON matches(community_id, requested_at DESC);

-- ─────────────────────────────────────────────
-- 9. match_ratings
-- ─────────────────────────────────────────────
CREATE TABLE match_ratings (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id   UUID        REFERENCES matches(id) NOT NULL,
  rater_id   UUID        REFERENCES users(id)   NOT NULL,
  rating     SMALLINT    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- RLS Policies
-- ═══════════════════════════════════════════════

-- communities — dashboard admin owns their row via admin_auth_id
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manages own community" ON communities
  FOR ALL
  USING  (auth.uid() = admin_auth_id)
  WITH CHECK (auth.uid() = admin_auth_id);

-- users — service_role (AI agents) can do anything; dashboard admin reads their community's users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on users" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin reads community users" ON users
  FOR SELECT USING (
    id IN (
      SELECT cm.user_id FROM community_members cm
      JOIN   communities c ON c.id = cm.community_id
      WHERE  c.admin_auth_id = auth.uid()
    )
  );

-- community_members
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on community_members" ON community_members
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin manages community members" ON community_members
  FOR ALL
  USING  (community_id IN (SELECT id FROM communities WHERE admin_auth_id = auth.uid()))
  WITH CHECK (community_id IN (SELECT id FROM communities WHERE admin_auth_id = auth.uid()));

-- skill_cards
ALTER TABLE skill_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on skill_cards" ON skill_cards
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin reads skill cards" ON skill_cards
  FOR SELECT USING (
    community_id IN (SELECT id FROM communities WHERE admin_auth_id = auth.uid())
  );

-- posts
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on posts" ON posts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin reads posts" ON posts
  FOR SELECT USING (
    community_id IN (SELECT id FROM communities WHERE admin_auth_id = auth.uid())
  );

-- moderation_logs — AI writes via service_role; admin reads only
ALTER TABLE moderation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on moderation_logs" ON moderation_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin reads moderation logs" ON moderation_logs
  FOR SELECT USING (
    community_id IN (SELECT id FROM communities WHERE admin_auth_id = auth.uid())
  );

-- human_reviews — admin inserts/reads
ALTER TABLE human_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on human_reviews" ON human_reviews
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin manages human reviews" ON human_reviews
  FOR ALL
  USING (
    moderation_log_id IN (
      SELECT ml.id FROM moderation_logs ml
      JOIN   communities c ON c.id = ml.community_id
      WHERE  c.admin_auth_id = auth.uid()
    )
  )
  WITH CHECK (
    moderation_log_id IN (
      SELECT ml.id FROM moderation_logs ml
      JOIN   communities c ON c.id = ml.community_id
      WHERE  c.admin_auth_id = auth.uid()
    )
  );

-- matches
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on matches" ON matches
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin reads matches" ON matches
  FOR SELECT USING (
    community_id IN (SELECT id FROM communities WHERE admin_auth_id = auth.uid())
  );

-- match_ratings
ALTER TABLE match_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role full access on match_ratings" ON match_ratings
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "admin reads match ratings" ON match_ratings
  FOR SELECT USING (
    match_id IN (
      SELECT m.id FROM matches m
      JOIN   communities c ON c.id = m.community_id
      WHERE  c.admin_auth_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- Helper function
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_community_admin(_community_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM communities WHERE id = _community_id AND admin_auth_id = auth.uid()
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_community_admin(uuid) TO authenticated;
