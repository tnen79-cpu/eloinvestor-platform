-- =====================================================
-- ELOINVESTOR V18.4 - ADMIN FEATURES + USERS CLEAN FIX
-- إصلاح: كل المستخدمين ظهروا كإدارة + إدارة المستخدمين + أسماء التوثيق + البنرات + صور المشاريع
-- =====================================================

create extension if not exists "pgcrypto";

-- ---------- USERS ADMIN COLUMNS ----------
alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists whatsapp text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists admin_permissions jsonb default '[]'::jsonb;
alter table public.users add column if not exists admin_status text default 'inactive';
alter table public.users add column if not exists created_by_admin uuid;
alter table public.users add column if not exists is_blocked boolean default false;
alter table public.users add column if not exists subscription_status text default 'free';
alter table public.users add column if not exists plan text default 'free';
alter table public.users add column if not exists package_type text;
alter table public.users add column if not exists is_verified boolean default false;
alter table public.users add column if not exists verification_status text default 'none';
alter table public.users add column if not exists updated_at timestamptz default now();

-- مهم: لا تجعل أي مستخدم جديد يظهر كإدارة افتراضيًا
alter table public.users alter column is_admin set default false;
alter table public.users alter column admin_role drop default;
alter table public.users alter column admin_status set default 'inactive';
alter table public.users alter column admin_permissions set default '[]'::jsonb;

-- تنظيف أي مستخدم ظهر كإدارة بالخطأ، مع الحفاظ على حسابك فقط
update public.users
set
  is_admin = false,
  admin_role = null,
  admin_permissions = '[]'::jsonb,
  admin_status = 'inactive'
where lower(coalesce(email, '')) <> lower('na8061104@gmail.com')
  and (
    coalesce(is_admin, false) = true
    or lower(coalesce(admin_role, '')) in ('admin','super_admin','verification_admin','content_admin','finance_admin','support_admin')
    or lower(coalesce(admin_status, '')) in ('active','suspended','revoked')
  );

-- تثبيت حسابك Super Admin
update public.users
set
  role = 'super_admin',
  account_type = 'both',
  is_admin = true,
  admin_role = 'super_admin',
  admin_permissions = '["all"]'::jsonb,
  admin_status = 'active'
where lower(email) = lower('na8061104@gmail.com');

-- ---------- TABLES USED BY ADMIN ----------
create table if not exists public.platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text not null default '',
  placement text not null default 'home_top',
  image_url text,
  link_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order int default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  image_url text,
  url text,
  sort_order int default 100,
  is_cover boolean default false,
  created_at timestamptz default now()
);

alter table public.projects add column if not exists cover_image_url text;
alter table public.projects add column if not exists cover_image text;
alter table public.projects add column if not exists is_verified boolean default false;
alter table public.projects add column if not exists verification_status text default 'none';
alter table public.projects add column if not exists is_featured boolean default false;
alter table public.projects add column if not exists featured_until timestamptz;
alter table public.projects add column if not exists updated_at timestamptz default now();

alter table public.verification_requests add column if not exists project_id uuid;
alter table public.verification_requests add column if not exists project_title text;
alter table public.verification_requests add column if not exists admin_note text;
alter table public.verification_requests add column if not exists reviewed_at timestamptz;

-- ---------- DROP OLD RECURSIVE/CONFLICTING POLICIES ----------
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
drop policy if exists "users_select_own_or_admin" on public.users;
drop policy if exists "users_update_own_or_admin" on public.users;

-- ---------- SAFE ADMIN FUNCTIONS ----------
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
      and coalesce(u.admin_status, 'inactive') = 'active'
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
      and coalesce(u.admin_status, 'inactive') = 'active'
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
      and coalesce(u.admin_status, 'inactive') = 'active'
      and (
        lower(coalesce(u.role, '')) = 'super_admin'
        or lower(coalesce(u.admin_role, '')) = 'super_admin'
        or coalesce(u.admin_permissions, '[]'::jsonb) = '["all"]'::jsonb
        or coalesce(u.admin_permissions, '{}'::jsonb)->>'all' = 'true'
        or coalesce(u.admin_permissions, '{}'::jsonb)->>permission_key = 'true'
      )
  );
$$;

create or replace function public.admin_get_my_profile()
returns setof public.users
language sql
stable
security definer
set search_path = public
as $$
  select * from public.users u
  where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
  limit 1;
$$;

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

create or replace function public.admin_list_admin_users(search_text text default null, result_limit int default 500)
returns setof public.users
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_current_super_admin() then
    raise exception 'Super admin permission required';
  end if;

  return query
  select *
  from public.users u
  where (
    coalesce(u.is_admin, false) = true
    or lower(coalesce(u.role, '')) in ('admin','super_admin')
    or lower(coalesce(u.admin_role, '')) in ('admin','super_admin','verification_admin','content_admin','finance_admin','support_admin')
  )
  and (
    search_text is null
    or search_text = ''
    or lower(coalesce(u.email, '') || ' ' || coalesce(u.name, '') || ' ' || coalesce(u.full_name, '')) like '%' || lower(search_text) || '%'
  )
  order by u.created_at desc nulls last
  limit greatest(1, least(coalesce(result_limit, 500), 1000));
end;
$$;

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
    name = coalesce(patch->>'name', u.name),
    full_name = coalesce(patch->>'full_name', patch->>'name', u.full_name),
    phone = coalesce(patch->>'phone', u.phone),
    whatsapp = coalesce(patch->>'whatsapp', u.whatsapp),
    role = coalesce(patch->>'role', u.role),
    account_type = coalesce(patch->>'account_type', u.account_type),
    is_admin = coalesce((patch->>'is_admin')::boolean, u.is_admin),
    admin_role = case when patch ? 'admin_role' then nullif(patch->>'admin_role', '') else u.admin_role end,
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

-- ---------- GRANTS ----------
revoke all on function public.is_current_admin() from public;
revoke all on function public.is_current_super_admin() from public;
revoke all on function public.current_admin_has_permission(text) from public;
revoke all on function public.admin_get_my_profile() from public;
revoke all on function public.admin_list_users(text, int) from public;
revoke all on function public.admin_list_admin_users(text, int) from public;
revoke all on function public.admin_update_user(text, text, jsonb) from public;

grant execute on function public.is_current_admin() to authenticated;
grant execute on function public.is_current_super_admin() to authenticated;
grant execute on function public.current_admin_has_permission(text) to authenticated;
grant execute on function public.admin_get_my_profile() to authenticated;
grant execute on function public.admin_list_users(text, int) to authenticated;
grant execute on function public.admin_list_admin_users(text, int) to authenticated;
grant execute on function public.admin_update_user(text, text, jsonb) to authenticated;

-- ---------- SAFE USERS RLS ----------
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

-- ---------- ADS + IMAGES RLS ----------
alter table public.platform_ads enable row level security;
drop policy if exists "ads_public_select" on public.platform_ads;
drop policy if exists "ads_admin_all" on public.platform_ads;
create policy "ads_public_select" on public.platform_ads for select to public using (is_active = true or public.is_current_admin());
create policy "ads_admin_all" on public.platform_ads for all to authenticated using (public.current_admin_has_permission('content') or public.is_current_super_admin()) with check (public.current_admin_has_permission('content') or public.is_current_super_admin());

alter table public.project_images enable row level security;
drop policy if exists "project_images_public_select" on public.project_images;
drop policy if exists "project_images_admin_all" on public.project_images;
create policy "project_images_public_select" on public.project_images for select to public using (true);
create policy "project_images_admin_all" on public.project_images for all to authenticated using (public.current_admin_has_permission('projects') or public.is_current_super_admin()) with check (public.current_admin_has_permission('projects') or public.is_current_super_admin());

-- ---------- FINAL CHECK ----------
select email, role, is_admin, admin_role, admin_status, admin_permissions
from public.users
order by is_admin desc, created_at desc nulls last;
