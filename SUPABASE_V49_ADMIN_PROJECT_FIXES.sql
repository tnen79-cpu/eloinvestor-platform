-- v49 Admin + Project fixes
-- يعالج: ظهور طلبات توثيق المشاريع، عداد المشاهدات، ربط القطاعات، وإعداد النشر.

-- =========================
-- 1) Platform settings legacy compatible
-- =========================
create table if not exists public.platform_settings (
  key text primary key,
  value text default '',
  updated_at timestamptz default now()
);

alter table public.platform_settings add column if not exists key text;
alter table public.platform_settings add column if not exists value text default '';
alter table public.platform_settings add column if not exists updated_at timestamptz default now();

insert into public.platform_settings (key, value, updated_at)
values ('project_publish_mode', 'auto', now())
on conflict (key) do update set value = coalesce(public.platform_settings.value, excluded.value), updated_at = now();

-- =========================
-- 2) Projects compatibility columns
-- =========================
alter table public.projects add column if not exists views_count integer not null default 0;
alter table public.projects add column if not exists views integer not null default 0;
alter table public.projects add column if not exists contacts_count integer not null default 0;
alter table public.projects add column if not exists saves_count integer not null default 0;
alter table public.projects add column if not exists verification_status text default 'pending';
alter table public.projects add column if not exists is_verified boolean default false;
alter table public.projects add column if not exists status text default 'approved';
alter table public.projects add column if not exists is_active boolean default true;
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists sector text;

update public.projects
set views_count = greatest(coalesce(views_count, 0), coalesce(views, 0)),
    views = greatest(coalesce(views, 0), coalesce(views_count, 0))
where true;

-- Atomic view counter. Supports existing client calls.
create or replace function public.increment_project_view_count(p_project_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects
  set views_count = coalesce(views_count, 0) + 1,
      views = coalesce(views, 0) + 1
  where id::text = p_project_id;
end;
$$;

grant execute on function public.increment_project_view_count(text) to anon, authenticated, service_role;

-- UUID overload for older calls.
create or replace function public.increment_project_view_count(p_project_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.increment_project_view_count(p_project_id::text);
end;
$$;

grant execute on function public.increment_project_view_count(uuid) to anon, authenticated, service_role;

-- =========================
-- 3) Project views log
-- =========================
create table if not exists public.project_views_log (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  viewer_id uuid,
  viewer_auth_id uuid,
  ip_address text,
  user_agent text,
  created_at timestamptz default now()
);

alter table public.project_views_log add column if not exists project_id uuid;
alter table public.project_views_log add column if not exists viewer_id uuid;
alter table public.project_views_log add column if not exists viewer_auth_id uuid;
alter table public.project_views_log add column if not exists ip_address text;
alter table public.project_views_log add column if not exists user_agent text;
alter table public.project_views_log add column if not exists created_at timestamptz default now();

create index if not exists idx_project_views_log_project_id on public.project_views_log(project_id);
create index if not exists idx_project_views_log_created_at on public.project_views_log(created_at desc);

alter table public.project_views_log enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_views_log' and policyname='project_views_log_insert_anyone') then
    create policy project_views_log_insert_anyone on public.project_views_log for insert to anon, authenticated with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_views_log' and policyname='project_views_log_admin_read') then
    create policy project_views_log_admin_read on public.project_views_log for select to authenticated using (true);
  end if;
end $$;

-- =========================
-- 4) Verification requests for projects
-- =========================
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  project_id uuid,
  request_type text default 'project',
  type text default 'project',
  status text default 'pending',
  title text,
  project_title text,
  document_name text,
  document_url text,
  file_url text,
  file_path text,
  storage_path text,
  note text,
  admin_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.verification_requests add column if not exists user_auth_id uuid;
alter table public.verification_requests add column if not exists project_id uuid;
alter table public.verification_requests add column if not exists request_type text default 'project';
alter table public.verification_requests add column if not exists type text default 'project';
alter table public.verification_requests add column if not exists status text default 'pending';
alter table public.verification_requests add column if not exists title text;
alter table public.verification_requests add column if not exists project_title text;
alter table public.verification_requests add column if not exists document_name text;
alter table public.verification_requests add column if not exists document_url text;
alter table public.verification_requests add column if not exists file_url text;
alter table public.verification_requests add column if not exists file_path text;
alter table public.verification_requests add column if not exists storage_path text;
alter table public.verification_requests add column if not exists note text;
alter table public.verification_requests add column if not exists admin_note text;
alter table public.verification_requests add column if not exists created_at timestamptz default now();
alter table public.verification_requests add column if not exists updated_at timestamptz default now();

update public.verification_requests set request_type = coalesce(request_type, type, 'project') where request_type is null;
update public.verification_requests set type = coalesce(type, request_type, 'project') where type is null;
update public.verification_requests set status = coalesce(status, 'pending') where status is null;

create index if not exists idx_verification_requests_status on public.verification_requests(status);
create index if not exists idx_verification_requests_project on public.verification_requests(project_id);

-- If old project_documents exist, surface them in verification center as pending project verification requests.
insert into public.verification_requests (user_auth_id, project_id, request_type, type, status, title, project_title, document_name, document_url, file_url, file_path, storage_path, note, created_at)
select
  pd.user_auth_id,
  pd.project_id,
  'project',
  'project',
  coalesce(pd.status, 'pending'),
  'توثيق مشروع من مستندات المشروع',
  coalesce(p.title_ar, p.title, p.name, 'مشروع'),
  coalesce(pd.file_name, pd.title, 'مستند مشروع'),
  coalesce(pd.document_url, pd.file_url, ''),
  coalesce(pd.file_url, pd.document_url, ''),
  coalesce(pd.file_path, pd.storage_path, ''),
  coalesce(pd.storage_path, pd.file_path, ''),
  'تم إنشاء الطلب تلقائيًا من مستندات المشروع حتى يظهر في لوحة التوثيق.',
  coalesce(pd.created_at, now())
from public.project_documents pd
left join public.projects p on p.id = pd.project_id
where not exists (
  select 1 from public.verification_requests vr
  where vr.project_id = pd.project_id
    and coalesce(vr.document_url, vr.file_url, '') = coalesce(pd.document_url, pd.file_url, '')
);

-- =========================
-- 5) Sectors table compatibility
-- =========================
create table if not exists public.platform_sectors (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  name_ar text,
  name_en text,
  icon text default '◇',
  image_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now()
);

alter table public.platform_sectors add column if not exists key text;
alter table public.platform_sectors add column if not exists name_ar text;
alter table public.platform_sectors add column if not exists name_en text;
alter table public.platform_sectors add column if not exists icon text default '◇';
alter table public.platform_sectors add column if not exists image_url text;
alter table public.platform_sectors add column if not exists country_code text default 'om';
alter table public.platform_sectors add column if not exists is_active boolean default true;
alter table public.platform_sectors add column if not exists sort_order integer default 100;

insert into public.platform_sectors (key, name_ar, name_en, icon, country_code, is_active, sort_order)
values
  ('restaurants', 'مطاعم وكافيهات', 'Restaurants & Cafes', '🍽️', 'om', true, 10),
  ('retail', 'تجارة وتجزئة', 'Retail', '🛍️', 'om', true, 20),
  ('beauty', 'تجميل وعناية', 'Beauty', '✨', 'om', true, 30),
  ('services', 'خدمات', 'Services', '🔧', 'om', true, 40),
  ('technology', 'تقنية وتطبيقات', 'Technology', '💻', 'om', true, 50),
  ('real_estate', 'عقارات وضيافة', 'Real Estate', '🏢', 'om', true, 60),
  ('manufacturing', 'صناعة وإنتاج', 'Manufacturing', '🏭', 'om', true, 70)
on conflict (key) do nothing;

-- =========================
-- 6) Storage buckets used by project/profile/docs
-- =========================
insert into storage.buckets (id, name, public)
values
  ('project-images', 'project-images', true),
  ('project-documents', 'project-documents', true),
  ('verification-docs', 'verification-docs', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;
