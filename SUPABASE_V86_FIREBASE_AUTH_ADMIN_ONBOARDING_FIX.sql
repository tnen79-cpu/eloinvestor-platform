-- v86 Firebase Auth + Admin + Onboarding safe SQL
-- شغّل هذا الملف بعد رفع النسخة v86.

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  role text default 'user',
  account_type text default 'investor',
  created_at timestamptz default now()
);

alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists phone_country_code text;
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_status text default 'active';
alter table public.users add column if not exists admin_permissions jsonb default '{}'::jsonb;
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists profile_completed boolean default false;
alter table public.users add column if not exists provider text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists updated_at timestamptz default now();

update public.users
set account_type = 'investor'
where account_type is null or account_type = '';

update public.users
set role = 'user'
where role is null or role = '';

update public.users
set onboarding_completed = true,
    profile_completed = true
where (email is not null or phone is not null)
  and name is not null
  and account_type is not null
  and onboarding_completed is null;

create index if not exists idx_users_firebase_uid on public.users(firebase_uid);
create index if not exists idx_users_email on public.users(email);
create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_users_role on public.users(role);

-- اختياري: بعد معرفة Firebase UID الخاص بك، نفّذ التحديث التالي مع استبدال القيم:
-- update public.users
-- set firebase_uid = 'PUT_FIREBASE_UID_HERE', role = 'admin', admin_role = 'super_admin', is_admin = true, admin_status = 'active', account_type = 'both'
-- where email = 'YOUR_ADMIN_EMAIL_HERE';
