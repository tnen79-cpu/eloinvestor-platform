-- =========================================================
-- EloInvestor v90 Firebase Auth Core Clean
-- يشغّل Firebase Auth كطبقة تسجيل دخول، ويجعل Supabase مصدر البيانات والأدوار.
-- شغّل هذا الملف مرة واحدة بعد رفع v90.
-- =========================================================

begin;

create extension if not exists pgcrypto;

-- users compatibility
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  role text default 'user',
  account_type text default 'investor',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists phone_country_code text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists type text;
alter table public.users add column if not exists provider text default 'firebase';
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists profile_completed boolean default false;
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists admin_status text default 'active';
alter table public.users add column if not exists admin_permissions jsonb default '{}'::jsonb;
alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists created_at timestamptz default now();
alter table public.users add column if not exists updated_at timestamptz default now();

update public.users
set account_type = coalesce(nullif(account_type,''), nullif(type,''), 'investor'),
    type = coalesce(nullif(type,''), nullif(account_type,''), 'investor'),
    role = coalesce(nullif(role,''), 'user'),
    admin_status = coalesce(nullif(admin_status,''), 'active'),
    updated_at = now();

create unique index if not exists users_firebase_uid_unique
on public.users(firebase_uid)
where firebase_uid is not null and firebase_uid <> '';

create index if not exists users_email_idx on public.users(lower(email));
create index if not exists users_phone_idx on public.users(phone);
create index if not exists users_role_idx on public.users(role);
create index if not exists users_account_type_idx on public.users(account_type);

-- Security-definer RPCs used by old admin dashboard fallbacks.
create or replace function public.admin_list_users(search_text text default null, result_limit integer default 500)
returns setof public.users
language sql
security definer
set search_path = public
as $$
  select *
  from public.users u
  where search_text is null
     or search_text = ''
     or u.name ilike '%' || search_text || '%'
     or u.email ilike '%' || search_text || '%'
     or u.phone ilike '%' || search_text || '%'
     or u.firebase_uid ilike '%' || search_text || '%'
  order by u.created_at desc nulls last
  limit greatest(1, least(coalesce(result_limit, 500), 1000));
$$;

create or replace function public.admin_get_users()
returns setof public.users
language sql
security definer
set search_path = public
as $$
  select * from public.users order by created_at desc nulls last limit 1000;
$$;

grant execute on function public.admin_list_users(text, integer) to anon, authenticated;
grant execute on function public.admin_get_users() to anon, authenticated;

commit;
