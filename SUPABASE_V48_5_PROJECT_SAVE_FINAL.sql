-- v48.5 Project Save Final SQL
-- يشغّل مرة واحدة في Supabase SQL Editor

-- إعداد النشر حسب بنية جدول platform_settings القديمة أو الجديدة
create table if not exists public.platform_settings (
  key text primary key,
  value text default '',
  updated_at timestamptz default now()
);

alter table public.platform_settings add column if not exists key text;
alter table public.platform_settings add column if not exists value text default '';
alter table public.platform_settings add column if not exists updated_at timestamptz default now();

insert into public.platform_settings (key, value, updated_at)
values ('project_publish_mode', '{"mode":"auto"}', now())
on conflict (key) do update set value = excluded.value, updated_at = now();

-- أعمدة projects المطلوبة للسمارت فورم والتوافق مع النسخ القديمة
alter table public.projects add column if not exists title text;
alter table public.projects add column if not exists name text;
alter table public.projects add column if not exists title_ar text;
alter table public.projects add column if not exists title_en text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists description_ar text;
alter table public.projects add column if not exists description_en text;
alter table public.projects add column if not exists category text;
alter table public.projects add column if not exists sector text;
alter table public.projects add column if not exists project_type text default 'sale';
alter table public.projects add column if not exists opportunity_type text default 'sale';
alter table public.projects add column if not exists country_code text default 'om';
alter table public.projects add column if not exists governorate text;
alter table public.projects add column if not exists city text;
alter table public.projects add column if not exists location text;
alter table public.projects add column if not exists map_lat numeric;
alter table public.projects add column if not exists map_lng numeric;
alter table public.projects add column if not exists latitude numeric;
alter table public.projects add column if not exists longitude numeric;
alter table public.projects add column if not exists price numeric default 0;
alter table public.projects add column if not exists monthly_profit numeric default 0;
alter table public.projects add column if not exists expected_monthly_profit numeric default 0;
alter table public.projects add column if not exists roi numeric default 0;
alter table public.projects add column if not exists profit_percentage numeric default 0;
alter table public.projects add column if not exists funding_amount numeric default 0;
alter table public.projects add column if not exists required_funding numeric default 0;
alter table public.projects add column if not exists funding_percent numeric default 0;
alter table public.projects add column if not exists funding_percentage numeric default 0;
alter table public.projects add column if not exists partnership_share numeric default 0;
alter table public.projects add column if not exists partnership_percentage numeric default 0;
alter table public.projects add column if not exists franchise_fee numeric default 0;
alter table public.projects add column if not exists employees_count integer default 0;
alter table public.projects add column if not exists operating_years integer default 0;
alter table public.projects add column if not exists payback_months integer default 0;
alter table public.projects add column if not exists phone_country_code text default '+968';
alter table public.projects add column if not exists whatsapp_country_code text default '+968';
alter table public.projects add column if not exists contact_phone text;
alter table public.projects add column if not exists contact_whatsapp text;
alter table public.projects add column if not exists phone text;
alter table public.projects add column if not exists whatsapp text;
alter table public.projects add column if not exists status text default 'approved';
alter table public.projects add column if not exists moderation_status text default 'approved';
alter table public.projects add column if not exists publish_status text default 'approved';
alter table public.projects add column if not exists approval_status text default 'auto_approved';
alter table public.projects add column if not exists is_active boolean default true;
alter table public.projects add column if not exists verification_status text default 'pending';
alter table public.projects add column if not exists is_verified boolean default false;
alter table public.projects add column if not exists verified boolean default false;
alter table public.projects add column if not exists cover_image_url text;
alter table public.projects add column if not exists image_url text;
alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists owner_auth_id uuid;
alter table public.projects add column if not exists user_auth_id uuid;
alter table public.projects add column if not exists auth_id uuid;
alter table public.projects add column if not exists user_id uuid;
alter table public.projects add column if not exists owner_id uuid;
alter table public.projects add column if not exists created_by uuid;
alter table public.projects add column if not exists created_at timestamptz default now();
alter table public.projects add column if not exists updated_at timestamptz default now();

-- تنظيف القيم القديمة الفارغة
update public.projects set status = coalesce(status, 'approved');
update public.projects set moderation_status = coalesce(moderation_status, status, 'approved');
update public.projects set publish_status = coalesce(publish_status, status, 'approved');
update public.projects set verification_status = coalesce(verification_status, 'pending');
update public.projects set is_active = coalesce(is_active, true);

-- project_images fallback
create table if not exists public.project_images (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  image_url text,
  is_cover boolean default false,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- project_documents fallback
create table if not exists public.project_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid,
  user_auth_id uuid,
  document_type text,
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

-- سياسات RLS آمنة أساسية للحفظ من المتصفح إذا لم تستخدم SERVICE_ROLE_KEY
alter table public.projects enable row level security;

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
for insert to authenticated
with check (
  auth.uid() = user_auth_id
  or auth.uid() = owner_auth_id
  or auth.uid() = auth_id
  or auth.uid() = created_by
  or auth.uid() = user_id
  or auth.uid() = owner_id
);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
for update to authenticated
using (
  auth.uid() = user_auth_id
  or auth.uid() = owner_auth_id
  or auth.uid() = auth_id
  or auth.uid() = created_by
  or auth.uid() = user_id
  or auth.uid() = owner_id
)
with check (
  auth.uid() = user_auth_id
  or auth.uid() = owner_auth_id
  or auth.uid() = auth_id
  or auth.uid() = created_by
  or auth.uid() = user_id
  or auth.uid() = owner_id
);

drop policy if exists "projects_select_public" on public.projects;
create policy "projects_select_public" on public.projects
for select to anon, authenticated
using (coalesce(is_active, true) = true or auth.uid() = user_auth_id or auth.uid() = owner_auth_id or auth.uid() = auth_id or auth.uid() = created_by);
