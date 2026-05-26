
-- Communities
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  platform text not null,
  member_count integer not null default 0,
  group_url text,
  webhook_url text not null unique default replace(gen_random_uuid()::text, '-', ''),
  onboarded boolean not null default false,
  description text,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.communities enable row level security;
create policy "admin manages own community" on public.communities
  for all using (auth.uid() = admin_id) with check (auth.uid() = admin_id);

-- Helper: is current user the community admin?
create or replace function public.is_community_admin(_community_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.communities where id = _community_id and admin_id = auth.uid())
$$;

-- Members
create table public.members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  nickname text not null,
  persona_tag text,
  role text not null default 'member',
  engagement_score numeric not null default 0,
  created_at timestamptz not null default now()
);
alter table public.members enable row level security;
create policy "admin manages members" on public.members
  for all using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

-- Flagged posts
create table public.flagged_posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author text not null,
  content text not null,
  platform text not null,
  score numeric not null default 0,
  category text,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.flagged_posts enable row level security;
create policy "admin manages flagged posts" on public.flagged_posts
  for all using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

-- Match requests
create table public.match_requests (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  raw_text text not null,
  game text,
  role text,
  time_window text,
  parse_confidence numeric,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
alter table public.match_requests enable row level security;
create policy "admin manages match requests" on public.match_requests
  for all using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

-- Teams
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  game text not null,
  scheduled_time timestamptz,
  players jsonb not null default '[]'::jsonb,
  outcome text,
  created_at timestamptz not null default now()
);
alter table public.teams enable row level security;
create policy "admin manages teams" on public.teams
  for all using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

-- Activity feed
create table public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  type text not null,
  message text not null,
  created_at timestamptz not null default now()
);
alter table public.activity_feed enable row level security;
create policy "admin views activity" on public.activity_feed
  for all using (public.is_community_admin(community_id))
  with check (public.is_community_admin(community_id));

-- Leads (landing page)
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  admin_name text not null,
  group_name text not null,
  platform text not null,
  member_count text,
  contact text not null,
  created_at timestamptz not null default now()
);
alter table public.leads enable row level security;
create policy "anyone can submit lead" on public.leads
  for insert with check (true);
create policy "auth users read leads" on public.leads
  for select using (auth.uid() is not null);
