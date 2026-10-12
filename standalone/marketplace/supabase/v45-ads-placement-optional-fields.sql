-- v45 Ads placement + optional fields fix
-- يجعل نص الزر والوصف اختياريين بدون قيمة افتراضية مزعجة
alter table public.platform_ads add column if not exists subtitle text;
alter table public.platform_ads add column if not exists button_text text;
alter table public.platform_ads add column if not exists placement text default 'home_top';
alter table public.platform_ads add column if not exists starts_at timestamptz;
alter table public.platform_ads add column if not exists ends_at timestamptz;

alter table public.platform_ads alter column button_text drop default;

-- لا نحذف أي إعلان فعلي. فقط ننظف القيم الافتراضية القديمة التي تركت كنص زر بدون قصد.
update public.platform_ads
set button_text = null
where trim(coalesce(button_text,'')) = 'اعرف المزيد';
