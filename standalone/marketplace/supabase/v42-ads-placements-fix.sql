-- v42 Ads placements fix
-- يثبت أماكن ظهور الإعلانات ويضيف أمثلة لكل الصفحات.

alter table public.platform_ads add column if not exists placement text default 'home_top';
alter table public.platform_ads add column if not exists sort_order int default 0;
alter table public.platform_ads add column if not exists button_text text default 'اعرف المزيد';
alter table public.platform_ads add column if not exists starts_at timestamptz;
alter table public.platform_ads add column if not exists ends_at timestamptz;

insert into public.platform_ads (title, subtitle, image_url, link_url, button_text, placement, sort_order, is_active)
select 'إعلان الرئيسية', 'هذا الإعلان يظهر في السلايدر العلوي للصفحة الرئيسية', 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80', 'plans.html', 'شاهد الباقات', 'home_top', 1, true
where not exists (select 1 from public.platform_ads where placement='home_top');

insert into public.platform_ads (title, subtitle, image_url, link_url, button_text, placement, sort_order, is_active)
select 'روّج مشروعك', 'إعلان يظهر في صفحة الفرص أعلى النتائج', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80', 'add-project.html', 'أضف مشروع', 'opportunities_top', 1, true
where not exists (select 1 from public.platform_ads where placement='opportunities_top');

insert into public.platform_ads (title, subtitle, image_url, link_url, button_text, placement, sort_order, is_active)
select 'باقات النشر', 'إعلان يظهر في صفحة الباقات', 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=80', 'plans.html', 'اختر باقة', 'plans_top', 1, true
where not exists (select 1 from public.platform_ads where placement='plans_top');
