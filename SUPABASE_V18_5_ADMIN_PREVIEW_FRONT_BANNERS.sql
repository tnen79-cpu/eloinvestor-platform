-- =========================================
-- ELOINVESTOR V18.5
-- Admin preview + frontend banners/slides + safe users/admin permissions
-- Run in Supabase SQL Editor with RUN, not EXPLAIN.
-- =========================================

create extension if not exists "pgcrypto";

-- ---------- ADMIN COLUMNS DEFAULTS FIX ----------
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists admin_permissions jsonb default '{}'::jsonb;
alter table public.users add column if not exists admin_status text default 'inactive';
alter table public.users add column if not exists is_blocked boolean default false;
alter table public.users add column if not exists is_verified boolean default false;
alter table public.users add column if not exists verification_status text default 'none';
alter table public.users add column if not exists updated_at timestamptz;

alter table public.users alter column is_admin set default false;
alter table public.users alter column admin_role drop default;
alter table public.users alter column admin_status set default 'inactive';
alter table public.users alter column admin_permissions set default '{}'::jsonb;

-- Keep only the requested account as super admin if it exists.
update public.users
set role = 'super_admin', account_type = 'both', is_admin = true, admin_role = 'super_admin', admin_permissions = '{"all":true,"projects":true,"verifications":true,"packages":true,"recommendations":true,"notifications":true,"users":true,"content":true,"analytics":true}'::jsonb, admin_status = 'active'
where lower(email) = lower('na8061104@gmail.com');

update public.users
set is_admin = false, admin_role = null, admin_permissions = '{}'::jsonb, admin_status = 'inactive'
where lower(coalesce(email,'')) <> lower('na8061104@gmail.com')
  and coalesce(is_admin,false) = true
  and coalesce(admin_role,'') not in ('super_admin');

-- ---------- CONTENT TABLES ----------
create table if not exists public.homepage_slides (
  id uuid primary key default gen_random_uuid(),
  title_ar text,
  title_en text,
  subtitle_ar text,
  subtitle_en text,
  button_text_ar text,
  button_text_en text,
  button_url text,
  image_url text,
  country_code text default 'om',
  is_active boolean default true,
  slide_order int default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

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

alter table public.homepage_slides add column if not exists title_ar text;
alter table public.homepage_slides add column if not exists title_en text;
alter table public.homepage_slides add column if not exists subtitle_ar text;
alter table public.homepage_slides add column if not exists subtitle_en text;
alter table public.homepage_slides add column if not exists button_text_ar text;
alter table public.homepage_slides add column if not exists button_text_en text;
alter table public.homepage_slides add column if not exists button_url text;
alter table public.homepage_slides add column if not exists image_url text;
alter table public.homepage_slides add column if not exists country_code text default 'om';
alter table public.homepage_slides add column if not exists is_active boolean default true;
alter table public.homepage_slides add column if not exists slide_order int default 100;
alter table public.homepage_slides add column if not exists updated_at timestamptz default now();

alter table public.platform_ads add column if not exists title text default '';
alter table public.platform_ads add column if not exists placement text default 'home_top';
alter table public.platform_ads add column if not exists image_url text;
alter table public.platform_ads add column if not exists link_url text;
alter table public.platform_ads add column if not exists country_code text default 'om';
alter table public.platform_ads add column if not exists is_active boolean default true;
alter table public.platform_ads add column if not exists sort_order int default 100;
alter table public.platform_ads add column if not exists updated_at timestamptz default now();

create index if not exists homepage_slides_country_active_idx on public.homepage_slides(country_code, is_active, slide_order);
create index if not exists platform_ads_placement_active_idx on public.platform_ads(placement, country_code, is_active, sort_order);

-- ---------- PROJECT IMAGES ----------
create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  image_url text,
  url text,
  path text,
  is_cover boolean default false,
  sort_order int default 100,
  created_at timestamptz default now()
);

alter table public.project_images add column if not exists project_id uuid;
alter table public.project_images add column if not exists image_url text;
alter table public.project_images add column if not exists url text;
alter table public.project_images add column if not exists path text;
alter table public.project_images add column if not exists is_cover boolean default false;
alter table public.project_images add column if not exists sort_order int default 100;
create index if not exists project_images_project_idx on public.project_images(project_id, sort_order);

-- ---------- ADMIN HELPERS ----------
create or replace function public.is_current_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
      and coalesce(u.is_admin,false) = true
      and coalesce(u.admin_status,'active') not in ('suspended','revoked','inactive')
  );
$$;

create or replace function public.is_current_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
      and coalesce(u.is_admin,false) = true
      and (u.role = 'super_admin' or u.admin_role = 'super_admin' or coalesce(u.admin_permissions,'{}'::jsonb)->>'all' = 'true')
      and coalesce(u.admin_status,'active') = 'active'
  );
$$;

create or replace function public.current_admin_has_permission(permission_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_current_super_admin()
    or exists (
      select 1 from public.users u
      where (u.auth_id::text = auth.uid()::text or u.id::text = auth.uid()::text)
        and coalesce(u.is_admin,false) = true
        and coalesce(u.admin_status,'active') = 'active'
        and (coalesce(u.admin_permissions,'{}'::jsonb)->>permission_key = 'true')
    );
$$;

create or replace function public.admin_update_user(target_auth_id text default null, target_email text default null, patch jsonb default '{}'::jsonb)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare updated_row public.users;
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
    admin_role = case when patch ? 'admin_role' then nullif(patch->>'admin_role','') else u.admin_role end,
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

grant execute on function public.is_current_admin() to authenticated;
grant execute on function public.is_current_super_admin() to authenticated;
grant execute on function public.current_admin_has_permission(text) to authenticated;
grant execute on function public.admin_update_user(text,text,jsonb) to authenticated;

-- ---------- RLS WITHOUT DUPLICATE POLICY ERRORS ----------
alter table public.users enable row level security;
drop policy if exists "users_select_own_or_admin" on public.users;
drop policy if exists "users_update_own_or_admin" on public.users;
drop policy if exists "users_insert_own" on public.users;
create policy "users_select_own_or_admin" on public.users for select to authenticated using (auth.uid()::text = auth_id::text or auth.uid()::text = id::text or public.is_current_admin());
create policy "users_insert_own" on public.users for insert to authenticated with check (auth.uid()::text = auth_id::text or public.is_current_super_admin());
create policy "users_update_own_or_admin" on public.users for update to authenticated using (auth.uid()::text = auth_id::text or auth.uid()::text = id::text or public.current_admin_has_permission('users')) with check (auth.uid()::text = auth_id::text or auth.uid()::text = id::text or public.current_admin_has_permission('users'));

alter table public.homepage_slides enable row level security;
drop policy if exists "slides_public_select" on public.homepage_slides;
drop policy if exists "slides_admin_all" on public.homepage_slides;
create policy "slides_public_select" on public.homepage_slides for select to public using (is_active = true or public.is_current_admin());
create policy "slides_admin_all" on public.homepage_slides for all to authenticated using (public.current_admin_has_permission('content') or public.is_current_super_admin()) with check (public.current_admin_has_permission('content') or public.is_current_super_admin());

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

-- ---------- DONE CHECK ----------
select email, role, is_admin, admin_role, admin_status, admin_permissions from public.users order by is_admin desc, created_at desc nulls last;
