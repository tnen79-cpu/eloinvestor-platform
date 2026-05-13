-- =========================================
-- ELOINVESTOR V18.6
-- Public banners/slides visibility + rejected projects hidden
-- Run with RUN, not EXPLAIN.
-- =========================================

create extension if not exists "pgcrypto";

-- ---------- CONTENT TABLES ----------
create table if not exists public.platform_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz default now()
);

insert into public.platform_settings(key, value)
values ('homepage_slider_enabled', 'true')
on conflict (key) do nothing;

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

-- ---------- PROJECT STATUS SAFETY ----------
alter table public.projects add column if not exists status text default 'pending';
alter table public.projects add column if not exists is_active boolean default true;
alter table public.projects add column if not exists updated_at timestamptz;

-- رفض المشروع يعني لا يظهر في الواجهة العامة
update public.projects
set is_active = false, updated_at = now()
where lower(coalesce(status,'')) in ('rejected','declined','deleted','archived');

-- المشروع المنشور يبقى فعال
update public.projects
set is_active = true
where lower(coalesce(status,'')) in ('approved','active','published');

create index if not exists projects_public_visibility_idx on public.projects(country_code, status, is_active, created_at);

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

grant execute on function public.is_current_admin() to authenticated;

-- ---------- RLS FOR PUBLIC CONTENT ----------
alter table public.platform_settings enable row level security;
drop policy if exists "settings_public_read" on public.platform_settings;
drop policy if exists "settings_admin_all" on public.platform_settings;
create policy "settings_public_read" on public.platform_settings for select to public using (true);
create policy "settings_admin_all" on public.platform_settings for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());

alter table public.homepage_slides enable row level security;
drop policy if exists "slides_public_select" on public.homepage_slides;
drop policy if exists "slides_admin_all" on public.homepage_slides;
create policy "slides_public_select" on public.homepage_slides for select to public using (is_active = true or public.is_current_admin());
create policy "slides_admin_all" on public.homepage_slides for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());

alter table public.platform_ads enable row level security;
drop policy if exists "ads_public_select" on public.platform_ads;
drop policy if exists "ads_admin_all" on public.platform_ads;
create policy "ads_public_select" on public.platform_ads for select to public using (is_active = true or public.is_current_admin());
create policy "ads_admin_all" on public.platform_ads for all to authenticated using (public.is_current_admin()) with check (public.is_current_admin());

-- ---------- OPTIONAL SAMPLE PLACEMENTS ----------
-- placements supported by frontend:
-- home_top, home_middle,
-- opportunities_top, opportunities_middle,
-- project_details_top, project_details_middle,
-- dashboard_top, dashboard_bottom,
-- all_top, all_middle, all_bottom

-- ---------- DONE ----------
