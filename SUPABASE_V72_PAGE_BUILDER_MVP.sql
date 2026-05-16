-- =========================================================
-- EloInvestor v72 Page Builder MVP
-- باني صفحات بسيط داخل لوحة الإدارة مع أقسام قابلة للسحب والإفلات
-- =========================================================

create extension if not exists pgcrypto;

-- صفحات المنصة القابلة للبناء
create table if not exists public.platform_pages (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  country_code text default 'om',
  title_ar text default '',
  title_en text default '',
  status text default 'published', -- draft / published
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_pages add column if not exists page_key text;
alter table public.platform_pages add column if not exists country_code text default 'om';
alter table public.platform_pages add column if not exists title_ar text default '';
alter table public.platform_pages add column if not exists title_en text default '';
alter table public.platform_pages add column if not exists status text default 'published';
alter table public.platform_pages add column if not exists is_active boolean default true;
alter table public.platform_pages add column if not exists created_at timestamptz default now();
alter table public.platform_pages add column if not exists updated_at timestamptz default now();

update public.platform_pages
set page_key = coalesce(page_key, 'home')
where page_key is null;

-- أقسام الصفحة
create table if not exists public.page_sections (
  id uuid primary key default gen_random_uuid(),
  page_key text not null default 'home',
  country_code text default 'om',
  section_type text not null default 'cta', -- hero/search/sectors/featured_projects/banner/stats/cta
  title_ar text default '',
  title_en text default '',
  subtitle_ar text default '',
  subtitle_en text default '',
  image_url text default '',
  button_text_ar text default '',
  button_text_en text default '',
  button_url text default '',
  settings jsonb default '{}'::jsonb,
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.page_sections add column if not exists page_key text default 'home';
alter table public.page_sections add column if not exists country_code text default 'om';
alter table public.page_sections add column if not exists section_type text default 'cta';
alter table public.page_sections add column if not exists title_ar text default '';
alter table public.page_sections add column if not exists title_en text default '';
alter table public.page_sections add column if not exists subtitle_ar text default '';
alter table public.page_sections add column if not exists subtitle_en text default '';
alter table public.page_sections add column if not exists image_url text default '';
alter table public.page_sections add column if not exists button_text_ar text default '';
alter table public.page_sections add column if not exists button_text_en text default '';
alter table public.page_sections add column if not exists button_url text default '';
alter table public.page_sections add column if not exists settings jsonb default '{}'::jsonb;
alter table public.page_sections add column if not exists is_active boolean default true;
alter table public.page_sections add column if not exists sort_order integer default 100;
alter table public.page_sections add column if not exists created_at timestamptz default now();
alter table public.page_sections add column if not exists updated_at timestamptz default now();

update public.page_sections set page_key = coalesce(page_key, 'home') where page_key is null;
update public.page_sections set section_type = coalesce(section_type, 'cta') where section_type is null;
update public.page_sections set settings = coalesce(settings, '{}'::jsonb) where settings is null;

create index if not exists idx_page_sections_page_key_order on public.page_sections(page_key, sort_order);
create index if not exists idx_page_sections_country_active on public.page_sections(country_code, is_active);
create index if not exists idx_platform_pages_key_country on public.platform_pages(page_key, country_code);

-- قالب افتراضي للصفحة الرئيسية، لا يكرر نفسه إذا شغلت الملف أكثر من مرة
insert into public.platform_pages (page_key, country_code, title_ar, title_en, status, is_active)
select 'home', 'om', 'الرئيسية', 'Home', 'published', true
where not exists (
  select 1 from public.platform_pages where page_key = 'home' and coalesce(country_code,'om') = 'om'
);

insert into public.page_sections (page_key, country_code, section_type, title_ar, title_en, subtitle_ar, subtitle_en, button_text_ar, button_text_en, button_url, settings, sort_order, is_active)
select 'home', 'om', 'hero', 'استثمر أو اعرض مشروعك بسهولة', 'Invest or list your business with ease', 'منصة تجمع أصحاب المشاريع مع المستثمرين الجادين في مكان واحد.', 'A marketplace connecting entrepreneurs with serious investors.', 'تصفح الفرص', 'Explore opportunities', '/om/ar/opportunities', '{"layout":"split"}'::jsonb, 10, true
where not exists (select 1 from public.page_sections where page_key='home' and section_type='hero' and sort_order=10);

insert into public.page_sections (page_key, country_code, section_type, title_ar, title_en, settings, sort_order, is_active)
select 'home', 'om', 'search', 'ابحث عن فرصة مناسبة', 'Find the right opportunity', '{"compact":true}'::jsonb, 20, true
where not exists (select 1 from public.page_sections where page_key='home' and section_type='search' and sort_order=20);

insert into public.page_sections (page_key, country_code, section_type, title_ar, title_en, settings, sort_order, is_active)
select 'home', 'om', 'sectors', 'تصفح حسب القطاع', 'Browse by sector', '{"limit":8}'::jsonb, 30, true
where not exists (select 1 from public.page_sections where page_key='home' and section_type='sectors' and sort_order=30);

insert into public.page_sections (page_key, country_code, section_type, title_ar, title_en, settings, sort_order, is_active)
select 'home', 'om', 'featured_projects', 'فرص مميزة', 'Featured opportunities', '{"limit":6}'::jsonb, 40, true
where not exists (select 1 from public.page_sections where page_key='home' and section_type='featured_projects' and sort_order=40);

insert into public.page_sections (page_key, country_code, section_type, title_ar, title_en, subtitle_ar, subtitle_en, button_text_ar, button_text_en, button_url, sort_order, is_active)
select 'home', 'om', 'cta', 'ابدأ رحلتك الاستثمارية اليوم', 'Start your investment journey today', 'أضف مشروعك أو تصفح الفرص الاستثمارية.', 'List your project or browse investment opportunities.', 'أضف مشروعك', 'List project', '/om/ar/add-project', 50, true
where not exists (select 1 from public.page_sections where page_key='home' and section_type='cta' and sort_order=50);

-- RLS آمن للتطوير: القراءة للعامة، والتحكم للمستخدمين المصادقين.
-- يمكن تضييقها لاحقاً للمشرفين فقط عند الإطلاق النهائي.
alter table public.platform_pages enable row level security;
alter table public.page_sections enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_pages' and policyname='platform_pages_public_read') then
    create policy platform_pages_public_read on public.platform_pages for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='page_sections' and policyname='page_sections_public_read') then
    create policy page_sections_public_read on public.page_sections for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='platform_pages' and policyname='platform_pages_authenticated_write') then
    create policy platform_pages_authenticated_write on public.platform_pages for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='page_sections' and policyname='page_sections_authenticated_write') then
    create policy page_sections_authenticated_write on public.page_sections for all to authenticated using (true) with check (true);
  end if;
end $$;
