-- EloInvestor v43.1 — FIXED Languages & Translations Admin Control
-- يحل خطأ: column name_ar does not exist
-- آمن للتشغيل حتى لو جدول platform_languages موجود مسبقاً بأعمدة ناقصة.

create extension if not exists pgcrypto;

create table if not exists public.platform_languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.platform_languages
  add column if not exists name_ar text,
  add column if not exists name_en text,
  add column if not exists direction text default 'rtl',
  add column if not exists is_default boolean default false,
  add column if not exists is_active boolean default true,
  add column if not exists sort_order integer default 100;

update public.platform_languages set
  name_ar = coalesce(name_ar, case code when 'ar' then 'العربية' when 'en' then 'الإنجليزية' else code end),
  name_en = coalesce(name_en, case code when 'ar' then 'Arabic' when 'en' then 'English' else code end),
  direction = coalesce(direction, case when code = 'en' then 'ltr' else 'rtl' end),
  is_default = coalesce(is_default, false),
  is_active = coalesce(is_active, true),
  sort_order = coalesce(sort_order, 100);

alter table public.platform_languages
  alter column name_ar set default '',
  alter column name_en set default '',
  alter column direction set default 'rtl',
  alter column is_default set default false,
  alter column is_active set default true,
  alter column sort_order set default 100;

-- ضمان عدم وجود أكثر من لغة افتراضية قبل إنشاء الفهرس
update public.platform_languages set is_default = false where code <> 'ar' and is_default = true;
insert into public.platform_languages (code, name_ar, name_en, direction, is_default, is_active, sort_order)
values
  ('ar', 'العربية', 'Arabic', 'rtl', true, true, 1),
  ('en', 'الإنجليزية', 'English', 'ltr', false, true, 2)
on conflict (code) do update set
  name_ar = excluded.name_ar,
  name_en = excluded.name_en,
  direction = excluded.direction,
  is_default = excluded.is_default,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

update public.platform_languages set is_default = false where code <> 'ar' and is_default = true;
update public.platform_languages set is_default = true where code = 'ar';

drop index if exists public.platform_languages_one_default_idx;
create unique index platform_languages_one_default_idx
  on public.platform_languages ((is_default))
  where is_default = true;

create table if not exists public.platform_translations (
  id uuid primary key default gen_random_uuid(),
  namespace text not null default 'common',
  translation_key text not null,
  ar text not null default '',
  en text not null default '',
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(namespace, translation_key)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_platform_languages_touch on public.platform_languages;
create trigger trg_platform_languages_touch
before update on public.platform_languages
for each row execute function public.touch_updated_at();

drop trigger if exists trg_platform_translations_touch on public.platform_translations;
create trigger trg_platform_translations_touch
before update on public.platform_translations
for each row execute function public.touch_updated_at();

insert into public.platform_translations (namespace, translation_key, ar, en, notes, is_active)
values
  ('common', 'login', 'تسجيل الدخول', 'Login', 'Header auth button', true),
  ('common', 'register', 'إنشاء حساب', 'Create Account', 'Header auth button', true),
  ('common', 'add_project', 'أضف مشروعك', 'Add Project', 'Main CTA', true),
  ('home', 'hero_title', 'استثمر في فرص حقيقية بثقة وشفافية', 'Invest in real opportunities with confidence', 'Homepage hero title', true),
  ('home', 'hero_text', 'منصة إلو مستثمر تجمع أصحاب الأعمال مع المستثمرين في الخليج.', 'EloInvestor connects business owners with investors across the Gulf.', 'Homepage hero text', true),
  ('project', 'verified', 'موثق', 'Verified', 'Verified badge', true),
  ('project', 'contact', 'تواصل', 'Contact', 'Contact CTA', true),
  ('admin', 'languages', 'اللغات والترجمات', 'Languages & Translations', 'Admin tab label', true)
on conflict (namespace, translation_key) do nothing;

alter table public.platform_languages enable row level security;
alter table public.platform_translations enable row level security;

drop policy if exists "public_read_active_languages" on public.platform_languages;
create policy "public_read_active_languages" on public.platform_languages
for select using (coalesce(is_active, true) = true);

drop policy if exists "public_read_active_translations" on public.platform_translations;
create policy "public_read_active_translations" on public.platform_translations
for select using (coalesce(is_active, true) = true);

-- سياسات إدارة مرنة لا تفشل لو لم يكن is_admin موجوداً في users
drop policy if exists "admin_manage_languages" on public.platform_languages;
create policy "admin_manage_languages" on public.platform_languages
for all using (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text)
      and (
        coalesce((to_jsonb(u)->>'is_admin')::boolean, false) = true
        or lower(coalesce(to_jsonb(u)->>'role','')) in ('admin','super_admin','content_admin')
      )
  )
) with check (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text)
      and (
        coalesce((to_jsonb(u)->>'is_admin')::boolean, false) = true
        or lower(coalesce(to_jsonb(u)->>'role','')) in ('admin','super_admin','content_admin')
      )
  )
);

drop policy if exists "admin_manage_translations" on public.platform_translations;
create policy "admin_manage_translations" on public.platform_translations
for all using (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text)
      and (
        coalesce((to_jsonb(u)->>'is_admin')::boolean, false) = true
        or lower(coalesce(to_jsonb(u)->>'role','')) in ('admin','super_admin','content_admin')
      )
  )
) with check (
  exists (
    select 1 from public.users u
    where (u.auth_id = auth.uid() or u.id::text = auth.uid()::text)
      and (
        coalesce((to_jsonb(u)->>'is_admin')::boolean, false) = true
        or lower(coalesce(to_jsonb(u)->>'role','')) in ('admin','super_admin','content_admin')
      )
  )
);
