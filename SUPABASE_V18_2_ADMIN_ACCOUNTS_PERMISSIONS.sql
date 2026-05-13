-- =========================================
-- ELOINVESTOR V18.2 ADMIN ACCOUNTS & PERMISSIONS
-- Safe for existing Supabase projects
-- =========================================

create extension if not exists "pgcrypto";

-- Users: add admin permission columns without breaking old schema
alter table if exists public.users add column if not exists admin_permissions jsonb default '{}'::jsonb;
alter table if exists public.users add column if not exists admin_status text default 'active';
alter table if exists public.users add column if not exists created_by_admin uuid;
alter table if exists public.users add column if not exists last_admin_update_at timestamptz;

-- Admin invites: used when Super Admin creates an admin before the user signs up
create table if not exists public.admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'admin',
  permissions jsonb not null default '{}'::jsonb,
  status text not null default 'invited',
  invited_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_admin_invites_email on public.admin_invites(lower(email));
create index if not exists idx_admin_invites_status on public.admin_invites(status);

-- Helper function avoids recursive RLS policies on users
create or replace function public.is_platform_admin(check_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where (u.auth_id::uuid = check_uid or u.id::uuid = check_uid)
      and lower(coalesce(u.role, u.account_type, '')) in ('admin', 'super_admin', 'support_admin', 'content_admin', 'finance_admin', 'verification_admin')
      and coalesce(u.admin_status, 'active') <> 'suspended'
  );
$$;

create or replace function public.is_platform_super_admin(check_uid uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where (u.auth_id::uuid = check_uid or u.id::uuid = check_uid)
      and lower(coalesce(u.role, '')) = 'super_admin'
      and coalesce(u.admin_status, 'active') <> 'suspended'
  );
$$;

-- Apply pending admin invite when a profile with the same email is created/updated
create or replace function public.apply_admin_invite_to_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv record;
begin
  if new.email is null then
    return new;
  end if;

  select * into inv
  from public.admin_invites
  where lower(email) = lower(new.email)
    and status = 'invited'
  order by created_at desc
  limit 1;

  if found then
    new.role := inv.role;
    new.account_type := coalesce(new.account_type, 'admin');
    new.admin_permissions := inv.permissions;
    new.admin_status := 'active';
    new.name := coalesce(new.name, inv.name, new.email);

    update public.admin_invites
      set status = 'accepted', accepted_by = coalesce(new.auth_id::uuid, new.id::uuid), accepted_at = now(), updated_at = now()
      where id = inv.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_apply_admin_invite_to_user on public.users;
create trigger trg_apply_admin_invite_to_user
before insert or update of email on public.users
for each row
execute function public.apply_admin_invite_to_user();

-- RLS
alter table public.admin_invites enable row level security;

-- Admin invites policies
drop policy if exists "admin_invites_select_admins" on public.admin_invites;
create policy "admin_invites_select_admins"
on public.admin_invites
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists "admin_invites_insert_super_admin" on public.admin_invites;
create policy "admin_invites_insert_super_admin"
on public.admin_invites
for insert
to authenticated
with check (public.is_platform_super_admin(auth.uid()));

drop policy if exists "admin_invites_update_super_admin" on public.admin_invites;
create policy "admin_invites_update_super_admin"
on public.admin_invites
for update
to authenticated
using (public.is_platform_super_admin(auth.uid()))
with check (public.is_platform_super_admin(auth.uid()));

-- Users admin management policies: lets super admin update roles/permissions from dashboard
alter table public.users enable row level security;

drop policy if exists "users_select_admins" on public.users;
create policy "users_select_admins"
on public.users
for select
to authenticated
using (
  auth.uid() = auth_id::uuid
  or public.is_platform_admin(auth.uid())
);

drop policy if exists "users_update_super_admin" on public.users;
create policy "users_update_super_admin"
on public.users
for update
to authenticated
using (
  auth.uid() = auth_id::uuid
  or public.is_platform_super_admin(auth.uid())
)
with check (
  auth.uid() = auth_id::uuid
  or public.is_platform_super_admin(auth.uid())
);

-- Admin logs support if not already installed
create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_auth_id uuid,
  action text not null,
  target_type text,
  target_id text,
  details jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_action_logs enable row level security;

drop policy if exists "admin_logs_select_admins" on public.admin_action_logs;
create policy "admin_logs_select_admins"
on public.admin_action_logs
for select
to authenticated
using (public.is_platform_admin(auth.uid()));

drop policy if exists "admin_logs_insert_admins" on public.admin_action_logs;
create policy "admin_logs_insert_admins"
on public.admin_action_logs
for insert
to authenticated
with check (public.is_platform_admin(auth.uid()));

-- Optional: seed one super admin manually after running this SQL, replacing the email:
-- update public.users set role = 'super_admin', admin_status = 'active', admin_permissions = '{"projects":true,"verifications":true,"packages":true,"recommendations":true,"notifications":true,"users":true,"content":true,"analytics":true}'::jsonb where email = 'YOUR_EMAIL@example.com';

