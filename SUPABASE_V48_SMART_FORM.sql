-- v48 Smart Form optional columns
-- Safe to run multiple times. The form uses fallback if any old database misses these columns.

alter table if exists public.projects
  add column if not exists funding_amount numeric default 0,
  add column if not exists required_funding numeric default 0,
  add column if not exists funding_percent numeric default 0,
  add column if not exists partnership_share numeric default 0,
  add column if not exists franchise_fee numeric default 0,
  add column if not exists employees_count integer default 0,
  add column if not exists operating_years numeric default 0,
  add column if not exists payback_months integer default 0;

-- Seed translation keys used by the smart form if your translations table exists.
insert into public.platform_translations (namespace, key, ar, en, is_active)
values
  ('add_project','opportunity_type','نوع الفرصة','Opportunity type',true),
  ('add_project','project_title','اسم المشروع','Project title',true),
  ('add_project','project_title_placeholder','مثال: مقهى قائم للبيع في مسقط','Example: Operating cafe for sale',true),
  ('add_project','category','القطاع','Category',true),
  ('add_project','region','المحافظة / المنطقة','Region',true),
  ('add_project','city','المدينة / الولاية','City',true),
  ('add_project','location_title','تحديد موقع المشروع من الخريطة','Select project location on map',true),
  ('add_project','location_desc','استخدم موقعك الحالي أو أدخل الإحداثيات ليظهر الموقع في صفحة المشروع.','Use your current location or enter coordinates to show the project map.',true),
  ('add_project','use_my_location','استخدم موقعي','Use my location',true)
on conflict (namespace, key) do update set
  ar = excluded.ar,
  en = excluded.en,
  is_active = true,
  updated_at = now();
