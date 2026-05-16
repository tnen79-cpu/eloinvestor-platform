-- EloInvestor v45 Translation Final Safe Migration
-- آمن للتشغيل أكثر من مرة، ومتوافق مع جدول platform_languages القديم الذي يحتوي name فقط.

create extension if not exists pgcrypto;

create table if not exists public.platform_languages (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text,
  name_ar text,
  name_en text,
  direction text default 'rtl',
  is_default boolean default false,
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_languages add column if not exists id uuid default gen_random_uuid();
alter table public.platform_languages add column if not exists code text;
alter table public.platform_languages add column if not exists name text;
alter table public.platform_languages add column if not exists name_ar text;
alter table public.platform_languages add column if not exists name_en text;
alter table public.platform_languages add column if not exists direction text default 'rtl';
alter table public.platform_languages add column if not exists is_default boolean default false;
alter table public.platform_languages add column if not exists is_active boolean default true;
alter table public.platform_languages add column if not exists sort_order integer default 100;
alter table public.platform_languages add column if not exists created_at timestamptz default now();
alter table public.platform_languages add column if not exists updated_at timestamptz default now();

alter table public.platform_languages alter column name drop not null;

update public.platform_languages
set
  name_ar = coalesce(nullif(name_ar, ''), nullif(name, ''), upper(code)),
  name_en = coalesce(nullif(name_en, ''), nullif(name, ''), upper(code)),
  name = coalesce(nullif(name, ''), nullif(name_ar, ''), nullif(name_en, ''), upper(code)),
  direction = coalesce(direction, case when code = 'en' then 'ltr' else 'rtl' end),
  is_active = coalesce(is_active, true),
  is_default = coalesce(is_default, false),
  sort_order = coalesce(sort_order, case when code = 'ar' then 1 when code = 'en' then 2 else 100 end)
where code is not null;

insert into public.platform_languages (code, name, name_ar, name_en, direction, is_default, is_active, sort_order)
values
  ('ar', 'العربية', 'العربية', 'Arabic', 'rtl', true, true, 1),
  ('en', 'English', 'الإنجليزية', 'English', 'ltr', false, true, 2)
on conflict (code) do update set
  name = excluded.name,
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  direction = excluded.direction,
  is_active = true,
  sort_order = excluded.sort_order,
  updated_at = now();

update public.platform_languages set is_default = false where code <> 'ar' and exists (select 1 from public.platform_languages where code = 'ar');
update public.platform_languages set is_default = true where code = 'ar';

create table if not exists public.platform_translations (
  id uuid primary key default gen_random_uuid(),
  namespace text not null default 'common',
  translation_key text not null,
  ar text,
  en text,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint platform_translations_namespace_key_unique unique (namespace, translation_key)
);

alter table public.platform_translations add column if not exists namespace text default 'common';
alter table public.platform_translations add column if not exists translation_key text;
alter table public.platform_translations add column if not exists ar text;
alter table public.platform_translations add column if not exists en text;
alter table public.platform_translations add column if not exists notes text;
alter table public.platform_translations add column if not exists is_active boolean default true;
alter table public.platform_translations add column if not exists created_at timestamptz default now();
alter table public.platform_translations add column if not exists updated_at timestamptz default now();

create unique index if not exists platform_translations_namespace_key_uidx
on public.platform_translations(namespace, translation_key);

insert into public.platform_translations (namespace, translation_key, ar, en, is_active)
values
('common','brand','إلو مستثمر','Alo Investor',true),
('common','home','الرئيسية','Home',true),
('common','opportunities','الفرص','Opportunities',true),
('common','add_project','أضف مشروعك','Add project',true),
('common','add_listing','أضف إعلانك','Add listing',true),
('common','packages','الباقات','Packages',true),
('common','dashboard','لوحة التحكم','Dashboard',true),
('common','account','حسابي','Account',true),
('common','login','تسجيل الدخول','Login',true),
('common','register','إنشاء حساب','Create account',true),
('common','search','بحث','Search',true),
('common','save','حفظ','Save',true),
('common','cancel','إلغاء','Cancel',true),
('common','edit','تعديل','Edit',true),
('common','delete','حذف','Delete',true),
('common','details','التفاصيل','Details',true),
('common','verified','موثق','Verified',true),
('common','sponsored','ممول','Sponsored',true),
('common','price','سعر المشروع','Project price',true),
('common','contact','تواصل','Contact',true),
('common','views','المشاهدات','Views',true),
('common','clicks','النقرات','Clicks',true),
('common','leads','التواصل','Leads',true),
('common','promote_now','روّج الآن','Promote now',true),
('home','all','🏠 الكل','🏠 All',true),
('home','hero_title','استثمر بذكاء في مشاريع حقيقية موثوقة وآمنة','Invest smarter in real verified projects',true),
('home','hero_subtitle','منصة إلو مستثمر تربط أصحاب المشاريع بالمستثمرين الجادين في عُمان — بشفافية كاملة وتواصل محمي.','Alo Investor connects serious investors with project owners in Oman through transparent and protected communication.',true),
('home','explore','تصفح الفرص ←','Explore opportunities →',true),
('home','list_project','+ أضف مشروعك','+ List your project',true),
('home','opportunities_count','فرصة استثمارية','Opportunities',true),
('home','verified_count','فرصة موثوقة','Verified',true),
('home','sponsored_count','مشروع مميز','Sponsored',true),
('home','governorates','محافظة عُمانية','Governorates',true),
('home','latest','أحدث الفرص','Latest opportunities',true),
('home','live','مباشر','Live',true),
('home','new','جديد','New',true),
('home','no_projects','لا توجد فرص منشورة بعد.','No published opportunities yet.',true),
('home','updated_now','آخر تحديث: الآن','Updated now',true),
('home','view_all','عرض الكل ←','View all →',true),
('home','browse_sector','تصفح حسب القطاع','Browse by sector',true),
('home','featured','فرص مميزة هذا الأسبوع','Featured this week',true),
('home','how_title','كيف تعمل المنصة؟','How it works',true),
('home','cta_title','ابدأ رحلتك الاستثمارية اليوم','Start your investment journey today',true),
('home','cta_desc','سواء كنت مستثمرًا تبحث عن فرصة حقيقية أو صاحب مشروع يريد التوسع — إلو مستثمر هو المكان الصحيح.','Whether you are an investor or project owner, Alo Investor is your trusted marketplace.',true),
('footer','description','منصة استثمارية تربط أصحاب المشاريع بالمستثمرين الجادين في عُمان والخليج، بتجربة واضحة وتواصل محمي.','An investment marketplace connecting project owners with serious investors across Oman and the Gulf.',true),
('footer','platform','المنصة','Platform',true),
('footer','opportunities','الفرص الاستثمارية','Opportunities',true),
('footer','add_project','أضف مشروعك','Add project',true),
('footer','packages','الباقات والأسعار','Packages',true),
('footer','suggested','فرص مقترحة','Suggested',true),
('footer','account','الحساب','Account',true),
('footer','messages','المحادثات','Messages',true),
('footer','trust','الثقة','Trust',true),
('footer','verification','التوثيق','Verification',true),
('footer','promote_projects','ترويج المشاريع','Promote projects',true),
('footer','privacy','سياسة الخصوصية','Privacy policy',true),
('footer','terms','شروط الاستخدام','Terms',true),
('footer','rights','إلو مستثمر. جميع الحقوق محفوظة.','Alo Investor. All rights reserved.',true),
('project','risk','المخاطر','Risk',true),
('project','low','منخفضة','Low',true),
('project','demand','الطلب','Demand',true),
('project','high','مرتفع','High',true),
('project','new','جديد','New',true),
('project','not_specified','غير محدد','Not specified',true),
('project','interested','مهتم','Leads',true),
('project','views','المشاهدات','Views',true),
('admin','languages','اللغات والترجمات','Languages & translations',true),
('admin','languages_desc','تحكم كامل باللغات والنصوص ومزامنة النصوص الافتراضية قبل النشر.','Full control over languages, labels, and default texts before launch.',true),
('admin','save_language','حفظ اللغة','Save language',true),
('admin','save_translation','حفظ الترجمة','Save translation',true),
('admin','auto_translate','ترجمة مبدئية','Initial translate',true),
('admin','export_json','تصدير JSON','Export JSON',true),
('admin','import_json','استيراد JSON','Import JSON',true),
('admin','seed_defaults','إضافة النصوص الافتراضية','Seed default texts',true)
on conflict (namespace, translation_key) do update set
  ar = excluded.ar,
  en = excluded.en,
  is_active = true,
  updated_at = now();

create table if not exists public.translation_provider_settings (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'manual',
  api_url text,
  api_key text,
  source_language text default 'ar',
  target_language text default 'en',
  is_enabled boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_languages enable row level security;
alter table public.platform_translations enable row level security;
alter table public.translation_provider_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_languages' and policyname = 'Public can read active languages') then
    create policy "Public can read active languages" on public.platform_languages for select using (is_active = true);
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_translations' and policyname = 'Public can read active translations') then
    create policy "Public can read active translations" on public.platform_translations for select using (is_active = true);
  end if;
end $$;
