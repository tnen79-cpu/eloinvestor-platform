-- v48.1 Smart Form safe SQL
-- متوافق مع جداول platform_translations القديمة التي تحتوي translation_key ومع النسخ الجديدة التي تستخدم key.

alter table if exists public.projects
  add column if not exists funding_amount numeric default 0,
  add column if not exists required_funding numeric default 0,
  add column if not exists funding_percent numeric default 0,
  add column if not exists partnership_share numeric default 0,
  add column if not exists franchise_fee numeric default 0,
  add column if not exists employees_count integer default 0,
  add column if not exists operating_years numeric default 0,
  add column if not exists payback_months integer default 0;

-- توحيد بنية جدول الترجمات بدون كسر الأعمدة القديمة
alter table if exists public.platform_translations
  add column if not exists namespace text default 'common',
  add column if not exists key text,
  add column if not exists translation_key text,
  add column if not exists ar text,
  add column if not exists en text,
  add column if not exists is_active boolean default true;

-- إزالة NOT NULL القديم حتى لا يكسر الإدخالات، مع أننا سنملأه أيضًا
alter table if exists public.platform_translations
  alter column translation_key drop not null;

-- مزامنة key و translation_key للبيانات القديمة
update public.platform_translations
set key = coalesce(key, translation_key)
where key is null;

update public.platform_translations
set translation_key = coalesce(translation_key, key)
where translation_key is null;

-- Seed / Upsert بدون الاعتماد على ON CONFLICT حتى لو لا يوجد unique constraint
with seed(namespace, key, translation_key, ar, en, is_active) as (
  values
    ('add_project','opportunity_type','opportunity_type','نوع الفرصة','Opportunity type',true),
    ('add_project','project_title','project_title','اسم المشروع','Project title',true),
    ('add_project','project_title_placeholder','project_title_placeholder','مثال: مقهى قائم للبيع في مسقط','Example: Operating cafe for sale',true),
    ('add_project','category','category','القطاع','Category',true),
    ('add_project','region','region','المحافظة / المنطقة','Region',true),
    ('add_project','city','city','المدينة / الولاية','City',true),
    ('add_project','location_title','location_title','تحديد موقع المشروع من الخريطة','Select project location on map',true),
    ('add_project','location_desc','location_desc','استخدم موقعك الحالي أو أدخل الإحداثيات ليظهر الموقع في صفحة المشروع.','Use your current location or enter coordinates to show the project map.',true),
    ('add_project','use_my_location','use_my_location','استخدم موقعي','Use my location',true)
)
update public.platform_translations t
set ar = seed.ar,
    en = seed.en,
    is_active = seed.is_active,
    key = coalesce(t.key, seed.key),
    translation_key = coalesce(t.translation_key, seed.translation_key),
    updated_at = now()
from seed
where t.namespace = seed.namespace
  and (t.key = seed.key or t.translation_key = seed.translation_key);

with seed(namespace, key, translation_key, ar, en, is_active) as (
  values
    ('add_project','opportunity_type','opportunity_type','نوع الفرصة','Opportunity type',true),
    ('add_project','project_title','project_title','اسم المشروع','Project title',true),
    ('add_project','project_title_placeholder','project_title_placeholder','مثال: مقهى قائم للبيع في مسقط','Example: Operating cafe for sale',true),
    ('add_project','category','category','القطاع','Category',true),
    ('add_project','region','region','المحافظة / المنطقة','Region',true),
    ('add_project','city','city','المدينة / الولاية','City',true),
    ('add_project','location_title','location_title','تحديد موقع المشروع من الخريطة','Select project location on map',true),
    ('add_project','location_desc','location_desc','استخدم موقعك الحالي أو أدخل الإحداثيات ليظهر الموقع في صفحة المشروع.','Use your current location or enter coordinates to show the project map.',true),
    ('add_project','use_my_location','use_my_location','استخدم موقعي','Use my location',true)
)
insert into public.platform_translations (namespace, key, translation_key, ar, en, is_active)
select seed.namespace, seed.key, seed.translation_key, seed.ar, seed.en, seed.is_active
from seed
where not exists (
  select 1 from public.platform_translations t
  where t.namespace = seed.namespace
    and (t.key = seed.key or t.translation_key = seed.translation_key)
);
