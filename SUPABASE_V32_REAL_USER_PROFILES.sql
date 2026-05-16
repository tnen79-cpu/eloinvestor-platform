-- =========================================
-- ELOINVESTOR V32 REAL USER PROFILES
-- profile pages, avatars, follows, public profile view
-- =========================================

create extension if not exists "pgcrypto";

alter table users add column if not exists full_name text;
alter table users add column if not exists avatar_url text;
alter table users add column if not exists bio text;
alter table users add column if not exists location text;
alter table users add column if not exists skills text[] default '{}';
alter table users add column if not exists profile_slug text;
alter table users add column if not exists profile_views_count bigint default 0;
alter table users add column if not exists trust_score numeric default 0;
alter table users add column if not exists average_rating numeric default 0;
alter table users add column if not exists ratings_count int default 0;
alter table users add column if not exists verification_status text default 'unverified';

update users
set profile_slug = coalesce(profile_slug, lower(regexp_replace(coalesce(name, split_part(email, '@', 1), auth_id::text), '[^a-zA-Z0-9]+', '-', 'g')))
where profile_slug is null;

alter table projects add column if not exists owner_auth_id uuid;
alter table projects add column if not exists user_auth_id uuid;
alter table projects add column if not exists user_id uuid;
alter table projects add column if not exists created_by uuid;
alter table projects add column if not exists owner_id uuid;
alter table projects add column if not exists status text default 'published';

create unique index if not exists idx_users_profile_slug_unique on users(profile_slug) where profile_slug is not null;
create index if not exists idx_users_auth_id_profile on users(auth_id);

create table if not exists user_followers (
  id uuid primary key default gen_random_uuid(),
  follower_auth_id uuid not null,
  following_auth_id uuid not null,
  created_at timestamptz default now(),
  unique(follower_auth_id, following_auth_id)
);

alter table user_followers enable row level security;
drop policy if exists "follows_select_public" on user_followers;
create policy "follows_select_public" on user_followers for select to anon, authenticated using (true);
drop policy if exists "follows_insert_own" on user_followers;
create policy "follows_insert_own" on user_followers for insert to authenticated with check (auth.uid() = follower_auth_id);
drop policy if exists "follows_delete_own" on user_followers;
create policy "follows_delete_own" on user_followers for delete to authenticated using (auth.uid() = follower_auth_id);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 3145728, array['image/jpeg','image/png','image/webp']::text[])
on conflict (id) do update set public=excluded.public, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "profile_avatars_select" on storage.objects;
create policy "profile_avatars_select" on storage.objects for select to public using (bucket_id='profile-avatars');
drop policy if exists "profile_avatars_insert_own" on storage.objects;
create policy "profile_avatars_insert_own" on storage.objects for insert to authenticated with check (bucket_id='profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "profile_avatars_update_own" on storage.objects;
create policy "profile_avatars_update_own" on storage.objects for update to authenticated using (bucket_id='profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id='profile-avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create or replace view public.public_user_profiles_view as
select
  u.id,
  u.auth_id,
  u.profile_slug,
  coalesce(u.name, u.full_name, split_part(u.email, '@', 1), 'مستخدم') as name,
  u.avatar_url,
  u.bio,
  u.location,
  u.skills,
  u.role,
  u.account_type,
  u.subscription_status,
  u.verification_status,
  coalesce(u.average_rating, 0) as average_rating,
  coalesce(u.ratings_count, 0) as ratings_count,
  coalesce(u.trust_score, 0) as trust_score,
  coalesce(u.profile_views_count, 0) as profile_views_count,
  u.created_at,
  (select count(*)::int from user_followers f where f.following_auth_id = u.auth_id) as followers_count,
  (select count(*)::int from projects p where (p.owner_auth_id = u.auth_id or p.user_auth_id = u.auth_id or p.user_id = u.auth_id or p.created_by = u.auth_id or p.owner_id = u.auth_id) and coalesce(p.status, 'published') in ('approved','active','published')) as projects_count
from users u
where u.auth_id is not null;

grant select on public.public_user_profiles_view to anon, authenticated;

create or replace function public.increment_profile_views(profile_auth uuid)
returns void
language plpgsql
security definer
as $$
begin
  update users set profile_views_count = coalesce(profile_views_count, 0) + 1 where auth_id = profile_auth;
end;
$$;
grant execute on function public.increment_profile_views(uuid) to anon, authenticated;

-- Optional: keep average rating columns synced from deal_ratings if table exists.
do $$
begin
  if to_regclass('public.deal_ratings') is not null then
    update users u
    set average_rating = coalesce(r.avg_rating, 0), ratings_count = coalesce(r.rating_count, 0)
    from (
      select reviewed_auth_id, avg(rating)::numeric(10,2) as avg_rating, count(*)::int as rating_count
      from deal_ratings
      where coalesce(status, 'published') in ('published','approved','active')
      group by reviewed_auth_id
    ) r
    where u.auth_id = r.reviewed_auth_id;
  end if;
end $$;
