-- =========================================
-- EloInvestor V31.1 — User profiles visibility fix
-- Safe patch for legacy Supabase projects
-- =========================================

create extension if not exists "pgcrypto";

alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists whatsapp text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists profile_slug text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists trust_score numeric default 0;
alter table public.users add column if not exists ratings_count integer default 0;
alter table public.users add column if not exists average_rating numeric default 0;
alter table public.users add column if not exists verification_status text default 'pending';

update public.users
set profile_slug = coalesce(
  nullif(profile_slug, ''),
  regexp_replace(lower(split_part(coalesce(email, id::text), '@', 1)), '[^a-z0-9_\-]+', '-', 'g') || '-' || left(coalesce(auth_id::text, id::text), 8)
)
where profile_slug is null or profile_slug = '';

create unique index if not exists idx_users_profile_slug_unique on public.users(profile_slug);
create index if not exists idx_users_auth_id_profile on public.users(auth_id);

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
create policy "user_followers_select_public" on public.user_followers for select to anon, authenticated using (true);

drop policy if exists "user_followers_insert_own" on public.user_followers;
create policy "user_followers_insert_own" on public.user_followers for insert to authenticated with check (auth.uid() = follower_auth_id);

drop policy if exists "user_followers_delete_own" on public.user_followers;
create policy "user_followers_delete_own" on public.user_followers for delete to authenticated using (auth.uid() = follower_auth_id);

create index if not exists idx_user_followers_following on public.user_followers(following_auth_id);
create index if not exists idx_user_followers_follower on public.user_followers(follower_auth_id);

-- Public view used by project details and profile pages even when users RLS is strict.
drop view if exists public.public_user_profiles_view;
create view public.public_user_profiles_view as
select
  id,
  auth_id,
  profile_slug,
  coalesce(name, full_name, split_part(email, '@', 1), 'مستخدم') as display_name,
  coalesce(name, full_name, split_part(email, '@', 1), 'مستخدم') as name,
  full_name,
  email,
  phone,
  whatsapp,
  avatar_url,
  bio,
  role,
  account_type,
  verification_status,
  average_rating,
  ratings_count,
  trust_score,
  created_at
from public.users;

grant select on public.public_user_profiles_view to anon;
grant select on public.public_user_profiles_view to authenticated;

-- Make old projects expose owner names when possible if project has owner_auth_id/user_auth_id.
-- No destructive changes.
