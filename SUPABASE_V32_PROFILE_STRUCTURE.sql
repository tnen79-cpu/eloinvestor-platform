-- =========================================
-- EloInvestor V32 - Public Profile Structure
-- =========================================

create extension if not exists "pgcrypto";

alter table users add column if not exists avatar_url text;
alter table users add column if not exists photo_url text;
alter table users add column if not exists bio text;
alter table users add column if not exists profile_slug text;
alter table users add column if not exists trust_score numeric default 0;
alter table users add column if not exists average_rating numeric default 0;
alter table users add column if not exists ratings_count int default 0;
alter table users add column if not exists verification_status text;

update users
set profile_slug = coalesce(profile_slug, regexp_replace(lower(split_part(email, '@', 1)), '[^a-z0-9]+', '-', 'g'))
where profile_slug is null and email is not null;

create table if not exists user_followers (
  id uuid primary key default gen_random_uuid(),
  follower_auth_id uuid not null,
  following_auth_id uuid not null,
  created_at timestamptz default now(),
  unique(follower_auth_id, following_auth_id)
);

create table if not exists deal_ratings (
  id uuid primary key default gen_random_uuid(),
  reviewer_auth_id uuid,
  reviewed_auth_id uuid not null,
  project_id uuid,
  rating int not null default 5,
  comment text,
  status text default 'published',
  created_at timestamptz default now()
);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 4194304, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

alter table user_followers enable row level security;
alter table deal_ratings enable row level security;

-- followers policies
drop policy if exists "followers_select_public" on user_followers;
create policy "followers_select_public" on user_followers for select to public using (true);

drop policy if exists "followers_insert_own" on user_followers;
create policy "followers_insert_own" on user_followers for insert to authenticated with check (auth.uid() = follower_auth_id);

drop policy if exists "followers_delete_own" on user_followers;
create policy "followers_delete_own" on user_followers for delete to authenticated using (auth.uid() = follower_auth_id);

-- ratings public read
drop policy if exists "ratings_select_public" on deal_ratings;
create policy "ratings_select_public" on deal_ratings for select to public using (coalesce(status,'published') <> 'rejected');

-- avatar storage policies
drop policy if exists "profile_avatars_select_public" on storage.objects;
create policy "profile_avatars_select_public" on storage.objects for select to public using (bucket_id = 'profile-avatars');

drop policy if exists "profile_avatars_insert_own" on storage.objects;
create policy "profile_avatars_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "profile_avatars_update_own" on storage.objects;
create policy "profile_avatars_update_own" on storage.objects for update to authenticated using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Safe public profile view. It intentionally excludes email from UI usage, but keeps it for legacy lookup.
drop view if exists public.public_user_profiles_view;
create view public.public_user_profiles_view as
select
  id,
  auth_id,
  profile_slug,
  name,
  full_name,
  display_name,
  company_name,
  email,
  phone,
  whatsapp,
  avatar_url,
  photo_url,
  bio,
  account_type,
  role,
  subscription_status,
  plan,
  verification_status,
  trust_score,
  average_rating,
  ratings_count,
  created_at
from users;

grant select on public.public_user_profiles_view to anon, authenticated;

-- Helpful indexes
create index if not exists idx_users_profile_slug on users(profile_slug);
create index if not exists idx_user_followers_following on user_followers(following_auth_id);
create index if not exists idx_deal_ratings_reviewed on deal_ratings(reviewed_auth_id, status);
