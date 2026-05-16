-- V47: profile avatar bucket + profile/dashboard columns + safe storage policies

-- 1) Storage buckets for profile photos (fixes: Bucket not found)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  3145728,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif'];

-- Optional aliases used as fallback by the frontend
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif']),
  ('user-avatars', 'user-avatars', true, 3145728, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 3145728;

-- 2) Safe user profile columns used by dashboard/public profile
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists about text;
alter table public.users add column if not exists city text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists whatsapp text;
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists verification_status text default 'unverified';
alter table public.users add column if not exists investor_verification_status text default 'unverified';
alter table public.users add column if not exists photo_url text;
alter table public.users add column if not exists bio text;
alter table public.users add column if not exists location text;
alter table public.users add column if not exists preferred_categories text[] default '{}';
alter table public.users add column if not exists preferred_location text;
alter table public.users add column if not exists budget_min numeric default 0;
alter table public.users add column if not exists budget_max numeric default 0;
alter table public.users add column if not exists investor_preferences jsonb default '{}'::jsonb;
alter table public.users add column if not exists auto_welcome_message text;
alter table public.users add column if not exists welcome_message text;
alter table public.users add column if not exists profile_slug text;
alter table public.users add column if not exists profile_views_count integer default 0;
alter table public.users add column if not exists followers_count integer default 0;
alter table public.users add column if not exists ratings_count integer default 0;
alter table public.users add column if not exists average_rating numeric default 0;
alter table public.users add column if not exists trust_score integer default 0;

-- 3) Storage policies. Ignore duplicate-policy errors by checking pg_policies.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_avatars_public_read') then
    create policy profile_avatars_public_read on storage.objects
    for select using (bucket_id in ('profile-avatars','avatars','user-avatars'));
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_avatars_auth_insert') then
    create policy profile_avatars_auth_insert on storage.objects
    for insert to authenticated
    with check (bucket_id in ('profile-avatars','avatars','user-avatars') and auth.uid() is not null);
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='profile_avatars_auth_update') then
    create policy profile_avatars_auth_update on storage.objects
    for update to authenticated
    using (bucket_id in ('profile-avatars','avatars','user-avatars') and auth.uid() is not null)
    with check (bucket_id in ('profile-avatars','avatars','user-avatars') and auth.uid() is not null);
  end if;
end $$;

-- 4) Public profile view compatible with multiple old schemas
drop view if exists public.public_user_profiles_view;
create view public.public_user_profiles_view as
select
  u.id,
  coalesce(u.auth_id::text, u.id::text) as auth_id,
  coalesce(u.name, u.full_name, split_part(coalesce(u.email,''), '@', 1), 'مستخدم') as name,
  u.email,
  coalesce(u.account_type, u.role, 'investor') as account_type,
  coalesce(u.role, 'user') as role,
  coalesce(u.avatar_url, u.photo_url, '') as avatar_url,
  coalesce(u.bio, u.about, '') as bio,
  coalesce(u.location, u.city, '') as location,
  coalesce(u.phone, '') as phone,
  coalesce(u.whatsapp, '') as whatsapp,
  coalesce(u.profile_slug, coalesce(u.auth_id::text, u.id::text)) as profile_slug,
  coalesce(u.verification_status, u.investor_verification_status, 'unverified') as verification_status,
  coalesce(u.profile_views_count, 0) as profile_views_count,
  coalesce(u.followers_count, 0) as followers_count,
  coalesce(u.ratings_count, 0) as ratings_count,
  coalesce(u.average_rating, 0) as average_rating,
  coalesce(u.trust_score, 0) as trust_score,
  coalesce(u.preferred_categories, '{}') as skills,
  coalesce(u.created_at, now()) as created_at
from public.users u;
