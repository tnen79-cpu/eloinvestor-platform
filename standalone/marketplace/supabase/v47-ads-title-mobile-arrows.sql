-- v47 Ads title optional + clean optional fields
alter table public.platform_ads add column if not exists title text;
alter table public.platform_ads alter column title drop not null;
alter table public.platform_ads alter column title drop default;
alter table public.platform_ads alter column subtitle drop default;
alter table public.platform_ads alter column button_text drop default;

-- تنظيف القيم التجريبية القديمة إذا كانت مستخدمة كافتراضي فقط
update public.platform_ads
set title = null
where trim(coalesce(title,'')) in ('مساحة إعلانية', 'عنوان الإعلان', 'إعلان');

update public.platform_ads
set subtitle = null
where trim(coalesce(subtitle,'')) in ('ضع إعلانك أمام آلاف المستثمرين المهتمين', 'وصف قصير يظهر فوق البنر');

update public.platform_ads
set button_text = null
where trim(coalesce(button_text,'')) in ('اعرف المزيد', 'أعلن الآن', 'تواصل معنا');
