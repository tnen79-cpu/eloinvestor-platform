-- =========================================================
-- EloInvestor v75 Phone OTP + Google Auth
-- Adds safe compatibility columns for phone-based accounts.
-- =========================================================

begin;

create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid,
  name text,
  email text,
  phone text,
  phone_country_code text default '+968',
  account_type text default 'investor',
  role text default 'user',
  plan text default 'free',
  subscription_status text default 'free',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists phone_country_code text default '+968';
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists created_at timestamptz default now();
alter table public.users add column if not exists updated_at timestamptz default now();

update public.users
set phone_country_code = coalesce(phone_country_code, '+968'),
    account_type = coalesce(account_type, 'investor'),
    role = coalesce(role, 'user'),
    plan = coalesce(plan, 'free'),
    subscription_status = coalesce(subscription_status, 'free')
where phone_country_code is null
   or account_type is null
   or role is null
   or plan is null
   or subscription_status is null;

-- Remove duplicate auth_id rows before adding uniqueness, keeping the newest physical row.
delete from public.users a
using public.users b
where a.ctid < b.ctid
  and a.auth_id is not null
  and b.auth_id is not null
  and a.auth_id = b.auth_id;

-- Remove duplicate phone rows before adding optional uniqueness.
delete from public.users a
using public.users b
where a.ctid < b.ctid
  and nullif(a.phone, '') is not null
  and nullif(b.phone, '') is not null
  and a.phone = b.phone;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_auth_id_unique'
  ) then
    alter table public.users add constraint users_auth_id_unique unique (auth_id);
  end if;
end $$;

create unique index if not exists users_phone_unique_not_null
on public.users(phone)
where phone is not null and phone <> '';

create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_users_account_type on public.users(account_type);

commit;
