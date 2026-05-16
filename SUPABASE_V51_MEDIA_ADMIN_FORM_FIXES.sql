-- =========================================================
-- EloInvestor v51 Media + Admin + Smart Form Fixes SAFE SQL
-- =========================================================

create extension if not exists pgcrypto;

-- Ensure project sectors/admin sectors table exists and is usable by smart form
create table if not exists public.platform_sectors (
  id uuid primary key default gen_random_uuid(),
  key text,
  slug text,
  code text,
  name_ar text not null default 'قطاع',
  name_en text not null default 'Sector',
  icon text default '◇',
  emoji text,
  image_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_sectors add column if not exists key text;
alter table public.platform_sectors add column if not exists slug text;
alter table public.platform_sectors add column if not exists code text;
alter table public.platform_sectors add column if not exists name_ar text default 'قطاع';
alter table public.platform_sectors add column if not exists name_en text default 'Sector';
alter table public.platform_sectors add column if not exists icon text default '◇';
alter table public.platform_sectors add column if not exists emoji text;
alter table public.platform_sectors add column if not exists image_url text;
alter table public.platform_sectors add column if not exists country_code text default 'om';
alter table public.platform_sectors add column if not exists is_active boolean default true;
alter table public.platform_sectors add column if not exists sort_order integer default 100;
alter table public.platform_sectors add column if not exists created_at timestamptz default now();
alter table public.platform_sectors add column if not exists updated_at timestamptz default now();

update public.platform_sectors
set key = coalesce(key, slug, code, lower(regexp_replace(coalesce(name_en, name_ar, id::text), '[^a-zA-Z0-9]+', '_', 'g')))
where key is null or key = '';

insert into public.platform_sectors (key, slug, code, name_ar, name_en, icon, country_code, sort_order, is_active)
select * from (values
  ('restaurants','restaurants','restaurants','مطاعم وكافيهات','Restaurants & Cafes','☕','om',10,true),
  ('retail','retail','retail','تجارة وتجزئة','Retail','🛍️','om',20,true),
  ('beauty','beauty','beauty','تجميل وعناية','Beauty','💄','om',30,true),
  ('services','services','services','خدمات','Services','⚙️','om',40,true),
  ('technology','technology','technology','تقنية وتطبيقات','Technology','💻','om',50,true),
  ('real_estate','real_estate','real_estate','عقارات وضيافة','Real estate','🏢','om',60,true),
  ('manufacturing','manufacturing','manufacturing','صناعة وإنتاج','Manufacturing','🏭','om',70,true)
) as seed(key, slug, code, name_ar, name_en, icon, country_code, sort_order, is_active)
where not exists (select 1 from public.platform_sectors s where s.key = seed.key);

-- Projects fields used by smart form/edit admin
alter table public.projects add column if not exists category_id uuid;
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists sector text;
alter table public.projects add column if not exists opportunity_type text;
alter table public.projects add column if not exists project_type text;
alter table public.projects add column if not exists cover_image_url text;
alter table public.projects add column if not exists image_url text;
alter table public.projects add column if not exists map_lat double precision;
alter table public.projects add column if not exists map_lng double precision;
alter table public.projects add column if not exists latitude double precision;
alter table public.projects add column if not exists longitude double precision;
alter table public.projects add column if not exists contact_phone text;
alter table public.projects add column if not exists contact_whatsapp text;
alter table public.projects add column if not exists phone_country_code text default '+968';
alter table public.projects add column if not exists whatsapp_country_code text default '+968';
alter table public.projects add column if not exists funding_amount numeric default 0;
alter table public.projects add column if not exists funding_percent numeric default 0;
alter table public.projects add column if not exists partnership_share numeric default 0;
alter table public.projects add column if not exists franchise_fee numeric default 0;
alter table public.projects add column if not exists employees_count numeric default 0;
alter table public.projects add column if not exists operating_years numeric default 0;
alter table public.projects add column if not exists payback_months numeric default 0;
alter table public.projects add column if not exists views_count integer default 0;
alter table public.projects add column if not exists contacts_count integer default 0;
alter table public.projects add column if not exists saves_count integer default 0;
alter table public.projects add column if not exists updated_at timestamptz default now();

-- Project images stable during edit
create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  image_url text,
  url text,
  is_cover boolean default false,
  sort_order integer default 100,
  created_at timestamptz default now()
);

alter table public.project_images add column if not exists project_id uuid;
alter table public.project_images add column if not exists image_url text;
alter table public.project_images add column if not exists url text;
alter table public.project_images add column if not exists is_cover boolean default false;
alter table public.project_images add column if not exists sort_order integer default 100;
alter table public.project_images add column if not exists created_at timestamptz default now();

-- Project documents stable during edit
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  document_type text default 'other',
  title text,
  file_name text,
  file_url text,
  document_url text,
  file_path text,
  storage_path text,
  note text,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.project_documents add column if not exists project_id uuid;
alter table public.project_documents add column if not exists user_auth_id uuid;
alter table public.project_documents add column if not exists document_type text default 'other';
alter table public.project_documents add column if not exists title text;
alter table public.project_documents add column if not exists file_name text;
alter table public.project_documents add column if not exists file_url text;
alter table public.project_documents add column if not exists document_url text;
alter table public.project_documents add column if not exists file_path text;
alter table public.project_documents add column if not exists storage_path text;
alter table public.project_documents add column if not exists note text;
alter table public.project_documents add column if not exists status text default 'pending';
alter table public.project_documents add column if not exists created_at timestamptz default now();

-- Project videos + reels
create table if not exists public.project_videos (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  video_url text,
  file_url text,
  file_name text,
  title text,
  sort_order integer default 100,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.project_videos add column if not exists project_id uuid;
alter table public.project_videos add column if not exists user_auth_id uuid;
alter table public.project_videos add column if not exists video_url text;
alter table public.project_videos add column if not exists file_url text;
alter table public.project_videos add column if not exists file_name text;
alter table public.project_videos add column if not exists title text;
alter table public.project_videos add column if not exists sort_order integer default 100;
alter table public.project_videos add column if not exists is_active boolean default true;
alter table public.project_videos add column if not exists created_at timestamptz default now();
alter table public.project_videos add column if not exists updated_at timestamptz default now();

-- FK cleanup safe
alter table public.project_images drop constraint if exists project_images_project_id_fkey;
alter table public.project_documents drop constraint if exists project_documents_project_id_fkey;
alter table public.project_videos drop constraint if exists project_videos_project_id_fkey;

delete from public.project_images i where i.project_id is not null and not exists (select 1 from public.projects p where p.id = i.project_id);
delete from public.project_documents d where d.project_id is not null and not exists (select 1 from public.projects p where p.id = d.project_id);
delete from public.project_videos v where v.project_id is not null and not exists (select 1 from public.projects p where p.id = v.project_id);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='project_images_project_id_fkey') then
    alter table public.project_images add constraint project_images_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='project_documents_project_id_fkey') then
    alter table public.project_documents add constraint project_documents_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname='project_videos_project_id_fkey') then
    alter table public.project_videos add constraint project_videos_project_id_fkey foreign key (project_id) references public.projects(id) on delete cascade;
  end if;
end $$;

create index if not exists idx_project_images_project on public.project_images(project_id);
create index if not exists idx_project_documents_project on public.project_documents(project_id);
create index if not exists idx_project_videos_project on public.project_videos(project_id);
create index if not exists idx_project_videos_active on public.project_videos(is_active, created_at);
create index if not exists idx_projects_category_id on public.projects(category_id);

-- Atomic project views
create or replace function public.increment_project_views(p_project_id uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.projects set views_count = coalesce(views_count,0) + 1, updated_at = now() where id = p_project_id;
end;
$$;

-- Slider/ads fields: buttons optional
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
  slide_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.homepage_slides add column if not exists image_url text;
alter table public.homepage_slides add column if not exists button_text_ar text;
alter table public.homepage_slides add column if not exists button_text_en text;
alter table public.homepage_slides add column if not exists button_url text;
alter table public.homepage_slides add column if not exists country_code text default 'om';
alter table public.homepage_slides add column if not exists is_active boolean default true;
alter table public.homepage_slides add column if not exists slide_order integer default 100;

create table if not exists public.platform_ads (
  id uuid primary key default gen_random_uuid(),
  title text,
  placement text default 'home_top',
  image_url text,
  link_url text,
  country_code text default 'om',
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_ads add column if not exists title text;
alter table public.platform_ads add column if not exists placement text default 'home_top';
alter table public.platform_ads add column if not exists image_url text;
alter table public.platform_ads add column if not exists link_url text;
alter table public.platform_ads add column if not exists country_code text default 'om';
alter table public.platform_ads add column if not exists is_active boolean default true;
alter table public.platform_ads add column if not exists sort_order integer default 100;

-- Storage buckets
insert into storage.buckets (id, name, public) select 'project-images','project-images',true where not exists (select 1 from storage.buckets where id='project-images');
insert into storage.buckets (id, name, public) select 'project-documents','project-documents',false where not exists (select 1 from storage.buckets where id='project-documents');
insert into storage.buckets (id, name, public) select 'project-videos','project-videos',true where not exists (select 1 from storage.buckets where id='project-videos');

-- RLS permissive dev policies for new media tables, tighten before final launch if needed.
alter table public.project_images enable row level security;
alter table public.project_documents enable row level security;
alter table public.project_videos enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_images' and policyname='project_images_dev_all') then
    create policy project_images_dev_all on public.project_images for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_documents' and policyname='project_documents_dev_all') then
    create policy project_documents_dev_all on public.project_documents for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_videos' and policyname='project_videos_dev_all') then
    create policy project_videos_dev_all on public.project_videos for all using (true) with check (true);
  end if;
end $$;
