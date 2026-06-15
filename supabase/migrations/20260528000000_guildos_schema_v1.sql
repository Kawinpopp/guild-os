-- ═══════════════════════════════════════════════
-- GuildOS Database Schema v1.0
-- ═══════════════════════════════════════════════

-- 1. communities
CREATE TABLE communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  platform VARCHAR(20) NOT NULL,
  platform_group_id VARCHAR(100) NOT NULL UNIQUE,
  admin_user_id UUID,
  subscription_tier VARCHAR(20) DEFAULT 'free',
  total_members INTEGER DEFAULT 0,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- 2. users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name VARCHAR(100) NOT NULL,
  platform_user_id VARCHAR(100) NOT NULL UNIQUE,
  platform_type VARCHAR(20) NOT NULL,
  warning_count SMALLINT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ
);

-- 3. community_members
CREATE TABLE community_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(community_id, user_id)
);

-- 4. skill_cards
CREATE TABLE skill_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) UNIQUE,
  community_id UUID REFERENCES communities(id),
  game VARCHAR(50) NOT NULL,
  role VARCHAR(50) NOT NULL,
  available_time JSONB NOT NULL,
  time_vector JSONB,
  play_style VARCHAR(20) NOT NULL,
  style_vector JSONB,
  goal VARCHAR(30) NOT NULL,
  rank VARCHAR(30),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. posts
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  platform_post_id VARCHAR(100) UNIQUE,
  content_type VARCHAR(20) NOT NULL,
  content_preview TEXT,
  is_blocked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_posts_community_time ON posts(community_id, created_at DESC);

-- 6. moderation_logs
CREATE TABLE moderation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) NOT NULL,
  post_id UUID REFERENCES posts(id) NOT NULL,
  user_id UUID REFERENCES users(id) NOT NULL,
  label VARCHAR(30) NOT NULL,
  confidence_score NUMERIC(4,3) NOT NULL,
  model_version VARCHAR(30) NOT NULL,
  action_taken VARCHAR(20) NOT NULL,
  threshold_used NUMERIC(4,3) NOT NULL,
  requires_review BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. human_reviews
CREATE TABLE human_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  moderation_log_id UUID REFERENCES moderation_logs(id) UNIQUE,
  reviewer_id UUID REFERENCES users(id),
  decision VARCHAR(20),
  note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. matches
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID REFERENCES communities(id) NOT NULL,
  requester_id UUID REFERENCES users(id) NOT NULL,
  matched_user_id UUID REFERENCES users(id) NOT NULL,
  game VARCHAR(50) NOT NULL,
  match_score NUMERIC(5,3) NOT NULL,
  game_score NUMERIC(5,3) NOT NULL,
  time_score NUMERIC(5,3) NOT NULL,
  role_score NUMERIC(5,3) NOT NULL,
  style_score NUMERIC(5,3) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);
CREATE INDEX idx_matches_community ON matches(community_id, requested_at DESC);

-- 9. match_ratings
CREATE TABLE match_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID REFERENCES matches(id) NOT NULL,
  rater_id UUID REFERENCES users(id) NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
