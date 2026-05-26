create extension if not exists "pgcrypto";

-- Communities
create table public.communities (
  id           uuid primary key default gen_random_uuid(),
  admin_id     uuid references auth.users(id) on delete cascade not null,
  name         text not null,
  platform     text not null check (platform in ('Facebook', 'Discord', 'LINE')),
  member_count integer default 0,
  group_url    text,
  webhook_url  text unique default gen_random_uuid()::text,
  onboarded    boolean default false,
  description  text,
  settings     jsonb default '{}'::jsonb,
  created_at   timestamptz default now() not null
);

alter table public.communities enable row level security;

create policy "Users manage own communities"
  on public.communities for all
  using (admin_id = auth.uid());

-- Members
create table public.members (
  id               uuid primary key default gen_random_uuid(),
  community_id     uuid references public.communities(id) on delete cascade not null,
  nickname         text not null,
  persona_tag      text,
  role             text default 'member',
  engagement_score integer default 0,
  created_at       timestamptz default now() not null
);

alter table public.members enable row level security;

create policy "Admin manages members"
  on public.members for all
  using (community_id in (select id from public.communities where admin_id = auth.uid()));

-- Flagged posts
create table public.flagged_posts (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  author       text not null,
  content      text not null,
  platform     text not null,
  score        float default 0,
  category     text,
  status       text default 'pending',
  created_at   timestamptz default now() not null
);

alter table public.flagged_posts enable row level security;

create policy "Admin manages flagged_posts"
  on public.flagged_posts for all
  using (community_id in (select id from public.communities where admin_id = auth.uid()));

-- Match requests
create table public.match_requests (
  id               uuid primary key default gen_random_uuid(),
  community_id     uuid references public.communities(id) on delete cascade not null,
  raw_text         text not null,
  game             text,
  role             text,
  time_window      text,
  parse_confidence float,
  status           text default 'pending',
  created_at       timestamptz default now() not null
);

alter table public.match_requests enable row level security;

create policy "Admin manages match_requests"
  on public.match_requests for all
  using (community_id in (select id from public.communities where admin_id = auth.uid()));

-- Teams
create table public.teams (
  id             uuid primary key default gen_random_uuid(),
  community_id   uuid references public.communities(id) on delete cascade not null,
  game           text not null,
  scheduled_time timestamptz,
  players        jsonb default '[]'::jsonb,
  outcome        text,
  created_at     timestamptz default now() not null
);

alter table public.teams enable row level security;

create policy "Admin manages teams"
  on public.teams for all
  using (community_id in (select id from public.communities where admin_id = auth.uid()));

-- Activity feed
create table public.activity_feed (
  id           uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade not null,
  type         text not null,
  message      text not null,
  created_at   timestamptz default now() not null
);

alter table public.activity_feed enable row level security;

create policy "Admin manages activity_feed"
  on public.activity_feed for all
  using (community_id in (select id from public.communities where admin_id = auth.uid()));
