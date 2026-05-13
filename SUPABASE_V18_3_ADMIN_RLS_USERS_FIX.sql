-- =====================================================
-- ELOINVESTOR V18.3 - ADMIN RLS + USERS VISIBILITY FIX
-- يحل مشكلة: infinite recursion detected in policy for relation "users"
-- ويعيد ظهور المستخدمين في لوحة الإدارة عبر RPC آمنة.
-- =====================================================

create extension if not exists "pgcrypto";

-- أعمدة الإدارة الأساسية
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_role text default 'admin';
alter table public.users add column if not exists admin_permissions jsonb default '[]'::jsonb;
alter table public.users add column if not exists admin_status text default 'active';
alter table public.users add column if not exists created_by_admin uuid;
alter table public.users add column if not exists is_blocked boolean default false;
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists name text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists package_type text;
alter table public.users add column if not exists is_verified boolean default false;
alter table public.users add column if not exists verification_status text default 'none';
alter table public.users add column if not exists updated_at timestamptz default now();

-- حذف كل السياسات القديمة التي كانت تسبب recursive lookup على users
alter table public.users disable row level security;

drop policy if exists "users_admin_all" on public.users;
drop policy if exists "users_select_admins" on public.users;
drop policy if exists "users_update_super_admin" on public.users;
drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_read_own" on public.users;
drop policy if exists "users_can_read_own" on public.users;
drop policy if exists "users_can_update_own" on public.users;
drop policy if exists "users_read_admin" on public.users;
drop policy if exists "users_update_admin" on public.users;

-- دالة تفحص هل المستخدم الحالي أدمن بدون دخول RLS في حلقة recursion
create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
      and coalesce(u.admin_status, 'active') = 'active'
      and (
        coalesce(u.is_admin, false) = true
        or lower(coalesce(u.role, '')) in ('admin', 'super_admin')
        or lower(coalesce(u.admin_role, '')) in ('admin', 'super_admin', 'verification_admin', 'content_admin', 'finance_admin', 'support_admin')
      )
  );
$$;

create or replace function public.is_current_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
      and coalesce(u.admin_status, 'active') = 'active'
      and (
        lower(coalesce(u.role, '')) = 'super_admin'
        or lower(coalesce(u.admin_role, '')) = 'super_admin'
        or coalesce(u.admin_permissions, '[]'::jsonb) = '["all"]'::jsonb
        or coalesce(u.admin_permissions, '{}'::jsonb)->>'all' = 'true'
      )
  );
$$;

create or replace function public.current_admin_has_permission(permission_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
      and coalesce(u.admin_status, 'active') = 'active'
      and (
        lower(coalesce(u.role, '')) = 'super_admin'
        or lower(coalesce(u.admin_role, '')) = 'super_admin'
        or coalesce(u.admin_permissions, '[]'::jsonb) = '["all"]'::jsonb
        or coalesce(u.admin_permissions, '{}'::jsonb)->>'all' = 'true'
        or coalesce(u.admin_permissions, '{}'::jsonb)->>permission_key = 'true'
      )
  );
$$;

-- RPC لجلب بروفايل الأدمن الحالي حتى لو direct select اتكسر بسبب RLS
create or replace function public.admin_get_my_profile()
returns setof public.users
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.users u
  where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
  limit 1;
$$;

-- RPC لجلب المستخدمين للوحة الإدارة
create or replace function public.admin_list_users(search_text text default null, result_limit int default 500)
returns setof public.users
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.current_admin_has_permission('users') and not public.is_current_super_admin() then
    raise exception 'Admin users permission required';
  end if;

  return query
  select *
  from public.users u
  where search_text is null
     or search_text = ''
     or lower(coalesce(u.email, '') || ' ' || coalesce(u.name, '') || ' ' || coalesce(u.full_name, '') || ' ' || coalesce(u.role, '') || ' ' || coalesce(u.account_type, '')) like '%' || lower(search_text) || '%'
  order by u.created_at desc nulls last
  limit greatest(1, least(coalesce(result_limit, 500), 1000));
end;
$$;

-- RPC لتحديث مستخدم من لوحة الإدارة بدون الاعتماد على direct update المكسور بالـ RLS
create or replace function public.admin_update_user(target_auth_id text default null, target_email text default null, patch jsonb default '{}'::jsonb)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_row public.users;
begin
  if not public.current_admin_has_permission('users') and not public.is_current_super_admin() then
    raise exception 'Admin users permission required';
  end if;

  update public.users u
  set
    role = coalesce(patch->>'role', u.role),
    account_type = coalesce(patch->>'account_type', u.account_type),
    is_admin = coalesce((patch->>'is_admin')::boolean, u.is_admin),
    admin_role = coalesce(patch->>'admin_role', u.admin_role),
    admin_permissions = coalesce(patch->'admin_permissions', u.admin_permissions),
    admin_status = coalesce(patch->>'admin_status', u.admin_status),
    subscription_status = coalesce(patch->>'subscription_status', u.subscription_status),
    plan = coalesce(patch->>'plan', u.plan),
    package_type = coalesce(patch->>'package_type', u.package_type),
    is_blocked = coalesce((patch->>'is_blocked')::boolean, u.is_blocked),
    is_verified = coalesce((patch->>'is_verified')::boolean, u.is_verified),
    verification_status = coalesce(patch->>'verification_status', u.verification_status),
    updated_at = now()
  where (target_auth_id is not null and (u.auth_id::text = target_auth_id or u.id::text = target_auth_id))
     or (target_email is not null and lower(u.email) = lower(target_email))
  returning * into updated_row;

  return updated_row;
end;
$$;

-- صلاحيات تنفيذ RPC
revoke all on function public.is_current_admin() from public;
revoke all on function public.is_current_super_admin() from public;
revoke all on function public.current_admin_has_permission(text) from public;
revoke all on function public.admin_get_my_profile() from public;
revoke all on function public.admin_list_users(text, int) from public;
revoke all on function public.admin_update_user(text, text, jsonb) from public;

grant execute on function public.is_current_admin() to authenticated;
grant execute on function public.is_current_super_admin() to authenticated;
grant execute on function public.current_admin_has_permission(text) to authenticated;
grant execute on function public.admin_get_my_profile() to authenticated;
grant execute on function public.admin_list_users(text, int) to authenticated;
grant execute on function public.admin_update_user(text, text, jsonb) to authenticated;

-- إعادة تفعيل RLS بسياسات آمنة لا تعمل recursion
alter table public.users enable row level security;

create policy "users_select_own_or_admin"
on public.users
for select
to authenticated
using (
  auth.uid()::text = auth_id::text
  or auth.uid()::text = id::text
  or public.is_current_admin()
);

create policy "users_insert_own"
on public.users
for insert
to authenticated
with check (
  auth.uid()::text = auth_id::text
  or public.is_current_super_admin()
);

create policy "users_update_own_or_admin"
on public.users
for update
to authenticated
using (
  auth.uid()::text = auth_id::text
  or auth.uid()::text = id::text
  or public.current_admin_has_permission('users')
)
with check (
  auth.uid()::text = auth_id::text
  or auth.uid()::text = id::text
  or public.current_admin_has_permission('users')
);

-- إصلاح يدوي لحسابك الحالي
update public.users
set
  role = 'super_admin',
  account_type = 'both',
  is_admin = true,
  admin_role = 'super_admin',
  admin_permissions = '["all"]'::jsonb,
  admin_status = 'active'
where lower(email) = lower('na8061104@gmail.com');

-- عرض النتيجة
select email, auth_id, role, account_type, is_admin, admin_role, admin_status, admin_permissions
from public.users
where lower(email) = lower('na8061104@gmail.com');
