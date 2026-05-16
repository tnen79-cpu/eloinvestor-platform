-- EloInvestor v46 Translation Full Coverage
-- يغلق ملف الترجمة: أعمدة آمنة + نصوص أساسية موسعة + إعدادات مزود الترجمة.
-- آمن للتشغيل أكثر من مرة.

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
('common','search_placeholder','ابحث عن فرصة استثمارية...','Search investment opportunities...',true),
('common','all_categories','كل القطاعات','All categories',true),
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
('common','later','لاحقاً','Later',true),
('common','promote_now','روّج الآن','Promote now',true),
('common','loading','جاري التحميل','Loading',true),
('auth','email','البريد الإلكتروني','Email',true),
('auth','password','كلمة المرور','Password',true),
('auth','full_name','الاسم الكامل','Full name',true),
('auth','login_button','دخول','Login',true),
('auth','login_loading','جاري الدخول...','Signing in...',true),
('auth','register_button','إنشاء حساب','Create account',true),
('auth','register_loading','جاري إنشاء الحساب...','Creating account...',true),
('auth','create_new_account','إنشاء حساب جديد','Create new account',true),
('auth','already_have_account','عندي حساب بالفعل','I already have an account',true),
('auth','account_created_check_email','تم إنشاء الحساب. افحص بريدك لتأكيد الحساب.','Account created. Check your email to confirm it.',true),
('auth','investor','مستثمر','Investor',true),
('auth','owner','صاحب مشروع','Project owner',true),
('auth','both','مستثمر وصاحب مشروع','Investor and owner',true),
('auth','login_required_title','سجّل الدخول لإضافة مشروعك','Login to add your project',true),
('auth','login_required_desc','إضافة المشاريع متاحة للحسابات المسجلة فقط حتى نحافظ على جودة الفرص والثقة داخل المنصة.','Project publishing is available to registered accounts only to keep opportunities trusted and high quality.',true),
('auth','owner_only_title','هذا الخيار مخصص لصاحب المشروع','This option is for project owners',true),
('auth','owner_only_desc','حساب المستثمر يستطيع تصفح الفرص والتواصل معها. لإضافة مشروع استخدم حساب صاحب مشروع أو حساب الاثنين معًا.','Investor accounts can browse and contact opportunities. To add a project, use a project owner or combined account.',true),
('auth','logout','تسجيل الخروج','Logout',true),
('auth','public_profile','صفحتي العامة','Public profile',true),
('auth','admin','لوحة الإدارة','Admin',true),
('auth','verification','التوثيق','Verification',true),
('auth','messages','المحادثات','Messages',true),
('add_project','new_project','مشروع جديد','New opportunity',true),
('add_project','edit_project','تعديل مشروع','Edit opportunity',true),
('add_project','submit_title','أضف مشروعك للمراجعة','Submit your project for review',true),
('add_project','edit_title','تعديل بيانات المشروع','Edit project details',true),
('add_project','submit_desc','املأ البيانات الأساسية وارفع صور المشروع. سيظهر المشروع بعد مراجعة الإدارة.','Fill in the core details and upload project photos. It will go live after admin review.',true),
('add_project','edit_desc','عدّل البيانات المطلوبة ثم احفظ التحديثات.','Update the required fields, then save changes.',true),
('add_project','project_title','اسم المشروع','Project title',true),
('add_project','project_title_placeholder','مثال: مقهى قائم للبيع في مسقط','Example: Operating cafe for sale',true),
('add_project','category','القطاع','Category',true),
('add_project','opportunity_type','نوع الفرصة','Opportunity type',true),
('add_project','region','المحافظة / المنطقة','Region',true),
('add_project','city','المدينة / الولاية','City',true),
('add_project','location_title','تحديد موقع المشروع من الخريطة','Select project location on map',true),
('add_project','location_desc','استخدم موقعك الحالي أو أدخل الإحداثيات ليظهر الموقع في صفحة المشروع.','Use your current location or enter coordinates to show the project map.',true),
('add_project','use_my_location','استخدم موقعي','Use my location',true),
('add_project','success_title','تم إضافة مشروعك بنجاح!','Your project was added successfully!',true),
('add_project','success_desc','هل تريد أن يصل مشروعك لأكثر مستثمر؟ روّج مشروعك الآن واحصل على ظهور أعلى في الصفحة الرئيسية ونتائج البحث.','Want your project to reach more investors? Promote it now for higher visibility on the home page and search results.',true),
('add_project','success_hint','الترويج يساعد مشروعك على الحصول على مشاهدات ونقرات وتواصل أكثر.','Promotion helps your project get more views, clicks, and contacts.',true),
('add_project','submit_success','تم إرسال المشروع للمراجعة بنجاح.','Project submitted for review successfully.',true),
('add_project','update_success','تم تحديث المشروع بنجاح وإرساله للمراجعة.','Project updated and sent for review.',true),
('add_project','save_error','حدث خطأ أثناء حفظ المشروع.','Failed to save project.',true),
('add_project','login_first','يجب تسجيل الدخول أولًا.','Please login first.',true),
('add_project','enter_title_desc','اكتب اسم المشروع والوصف.','Please enter project title and description.',true),
('add_project','geolocation_not_supported','المتصفح لا يدعم تحديد الموقع.','Geolocation is not supported.',true),
('add_project','geolocation_failed','تعذر الوصول للموقع. يمكنك إدخال الإحداثيات يدويًا.','Could not access location. You can enter coordinates manually.',true),
('opportunities','marketplace','سوق الفرص الاستثمارية','Investment Marketplace',true),
('opportunities','title','اكتشف فرصًا مختارة حسب ميزانيتك واهتمامك.','Explore opportunities by budget and interest.',true),
('opportunities','subtitle','صفحة موحدة مع هوية إلو مستثمر: فلترة دقيقة، كروت فاخرة، درجة مشروع، مؤشرات طلب، ومعلومات تساعد المستثمر على اتخاذ القرار بسرعة.','A premium opportunities page with filters, project score, demand indicators, and clear deal data.',true),
('opportunities','quick_search','ابحث بسرعة','Quick search',true),
('opportunities','search_placeholder','مثال: مقهى، تطبيق، متجر','Cafe, app, store',true),
('opportunities','all_budgets','كل الميزانيات','All budgets',true),
('opportunities','show_results','اعرض النتائج','Show results',true),
('opportunities','advanced_filters','فلترة متقدمة','Advanced filters',true),
('opportunities','reset','مسح','Reset',true),
('opportunities','deal_type','نوع الفرصة','Deal type',true),
('opportunities','project_sale','مشروع للبيع','Project sale',true),
('opportunities','partnership','شراكة','Partnership',true),
('opportunities','idea','فكرة استثمارية','Idea',true),
('opportunities','trust_level','مستوى الثقة','Trust level',true),
('opportunities','hot_deal','فرصة ساخنة','Hot deal',true),
('opportunities','apply_filters','تطبيق الفلترة','Apply filters',true),
('opportunities','featured_deals','فرص مميزة','Featured deals',true),
('opportunities','found_suffix','فرصة مناسبة','opportunities found',true),
('opportunities','active','فرصة نشطة','Active',true),
('opportunities','hot_deals','فرصة ساخنة','Hot deals',true),
('project','risk','المخاطر','Risk',true),
('project','low','منخفضة','Low',true),
('project','demand','الطلب','Demand',true),
('project','high','مرتفع','High',true),
('project','new','جديد','New',true),
('project','not_specified','غير محدد','Not specified',true),
('project','interested','مهتم','Leads',true),
('project','views','المشاهدات','Views',true),
('payment','paid_title','تم الدفع وتفعيل الخدمة','Payment complete',true),
('payment','received_title','وصلنا لنتيجة الدفع','Payment received',true),
('payment','paid_desc','تم تأكيد الدفع وتفعيل الخدمة تلقائياً حسب نوع العملية: باقة، ترويج، أو Boost.','Payment was confirmed and the paid service was activated automatically.',true),
('payment','pending_desc','إذا تم خصم المبلغ ولم تظهر الخدمة، افتح لوحة التحكم أو تواصل مع الإدارة.','If payment was deducted but service is not active, refresh from dashboard or contact admin.',true),
('payment','go_dashboard','الذهاب للوحة التحكم','Go to dashboard',true),
('payment','browse_opportunities','تصفح الفرص','Browse opportunities',true),
('payment','cancel_title','لم يكتمل الدفع','Payment was not completed',true),
('payment','cancel_desc','طلب الترويج محفوظ كقيد الدفع. يمكنك إعادة المحاولة من صفحة الترويج أو لوحة التحكم.','Your promotion request is saved as pending payment. You can try again anytime.',true),
('payment','promotion_dashboard','لوحة الترويج','Promotion dashboard',true),
('payment','back_opportunities','العودة للفرص','Back to opportunities',true),
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

alter table public.translation_provider_settings add column if not exists provider text default 'manual';
alter table public.translation_provider_settings add column if not exists api_url text;
alter table public.translation_provider_settings add column if not exists api_key text;
alter table public.translation_provider_settings add column if not exists source_language text default 'ar';
alter table public.translation_provider_settings add column if not exists target_language text default 'en';
alter table public.translation_provider_settings add column if not exists is_enabled boolean default false;
alter table public.translation_provider_settings add column if not exists created_at timestamptz default now();
alter table public.translation_provider_settings add column if not exists updated_at timestamptz default now();

insert into public.translation_provider_settings (provider, source_language, target_language, is_enabled)
select 'manual', 'ar', 'en', false
where not exists (select 1 from public.translation_provider_settings);

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
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'translation_provider_settings' and policyname = 'Authenticated can read translation provider settings') then
    create policy "Authenticated can read translation provider settings" on public.translation_provider_settings for select using (auth.role() = 'authenticated');
  end if;
end $$;
