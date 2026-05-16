-- =========================================
-- EloInvestor V31 — Public user profiles + follows
-- Safe for legacy Supabase projects
-- =========================================

create extension if not exists "pgcrypto";

-- Users profile fields
-- Legacy-safe user columns used by the profile page
alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists whatsapp text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists subscription_status text default 'free';

alter table public.users add column if not exists profile_slug text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists trust_score numeric default 0;
alter table public.users add column if not exists ratings_count integer default 0;
alter table public.users add column if not exists average_rating numeric default 0;
alter table public.users add column if not exists verification_status text default 'pending';

-- Fill profile slugs where possible
update public.users
set profile_slug = coalesce(
  nullif(profile_slug, ''),
  regexp_replace(lower(split_part(coalesce(email, id::text), '@', 1)), '[^a-z0-9_\-]+', '-', 'g') || '-' || left(coalesce(auth_id::text, id::text), 8)
)
where profile_slug is null or profile_slug = '';

create unique index if not exists idx_users_profile_slug_unique on public.users(profile_slug);
create index if not exists idx_users_auth_id_profile on public.users(auth_id);

-- Followers table
create table if not exists public.user_followers (
  id uuid primary key default gen_random_uuid(),
  follower_auth_id uuid not null,
  following_auth_id uuid not null,
  created_at timestamptz default now(),
  unique(follower_auth_id, following_auth_id),
  check (follower_auth_id <> following_auth_id)
);

alter table public.user_followers enable row level security;

drop policy if exists "user_followers_select_public" on public.user_followers;
create policy "user_followers_select_public"
on public.user_followers
for select
to authenticated
using (true);

drop policy if exists "user_followers_insert_own" on public.user_followers;
create policy "user_followers_insert_own"
on public.user_followers
for insert
to authenticated
with check (auth.uid() = follower_auth_id);

drop policy if exists "user_followers_delete_own" on public.user_followers;
create policy "user_followers_delete_own"
on public.user_followers
for delete
to authenticated
using (auth.uid() = follower_auth_id);

create index if not exists idx_user_followers_following on public.user_followers(following_auth_id);
create index if not exists idx_user_followers_follower on public.user_followers(follower_auth_id);

-- Public-safe profile view for admins/front-end when RLS allows views.
drop view if exists public.public_user_profiles_view;
create view public.public_user_profiles_view as
select
  id,
  auth_id,
  profile_slug,
  coalesce(name, full_name, split_part(email, '@', 1), 'مستخدم') as display_name,
  email,
  phone,
  whatsapp,
  avatar_url,
  bio,
  role,
  account_type,
  plan,
  subscription_status,
  verification_status,
  average_rating,
  ratings_count,
  trust_score,
  created_at
from public.users;

grant select on public.public_user_profiles_view to authenticated;
grant select on public.public_user_profiles_view to anon;

-- Ratings table compatibility if not already created
create table if not exists public.deal_ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_auth_id uuid not null,
  reviewed_auth_id uuid,
  project_id uuid,
  rating integer not null check (rating between 1 and 5),
  comment text,
  status text default 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz default now(),
  unique (reviewer_auth_id, reviewed_auth_id, project_id)
);

alter table public.deal_ratings enable row level security;

drop policy if exists "ratings_insert_own" on public.deal_ratings;
create policy "ratings_insert_own" on public.deal_ratings for insert to authenticated with check (reviewer_auth_id = auth.uid());

drop policy if exists "ratings_select_published_or_own" on public.deal_ratings;
create policy "ratings_select_published_or_own" on public.deal_ratings for select to authenticated using (status = 'published' or reviewer_auth_id = auth.uid() or reviewed_auth_id = auth.uid());

create index if not exists idx_deal_ratings_reviewed on public.deal_ratings(reviewed_auth_id, status);
create index if not exists idx_deal_ratings_project on public.deal_ratings(project_id, status);

-- Recalculate public rating stats
create or replace function public.recalculate_user_trust(target_user uuid)
returns void
language plpgsql
security definer
as $$
begin
  update public.users u
  set
    average_rating = coalesce((select round(avg(rating)::numeric, 2) from public.deal_ratings where reviewed_auth_id = target_user and status = 'published'), 0),
    ratings_count = coalesce((select count(*) from public.deal_ratings where reviewed_auth_id = target_user and status = 'published'), 0),
    trust_score = coalesce((select round(avg(rating)::numeric * 20, 2) from public.deal_ratings where reviewed_auth_id = target_user and status = 'published'), 0)
  where u.auth_id = target_user or u.id = target_user;
end;
$$;

grant execute on function public.recalculate_user_trust(uuid) to authenticated;
