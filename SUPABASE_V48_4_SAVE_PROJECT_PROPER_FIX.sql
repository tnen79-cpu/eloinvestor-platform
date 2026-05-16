-- v48.4 Save Project Proper Fix
-- Fixes smart form save failures on legacy schemas without replacing your existing tables.

-- 1) Platform setting: keep compatibility with old platform_settings(key,value)
create table if not exists public.platform_settings (
  key text primary key,
  value text default '',
  updated_at timestamptz default now()
);

alter table public.platform_settings add column if not exists key text;
alter table public.platform_settings add column if not exists value text default '';
alter table public.platform_settings add column if not exists updated_at timestamptz default now();

-- Make old setting key safe if your table was created without a primary key.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'platform_settings_key_unique'
  ) then
    begin
      alter table public.platform_settings
      add constraint platform_settings_key_unique unique (key);
    exception when duplicate_table then null;
    end;
  end if;
end $$;

insert into public.platform_settings (key, value, updated_at)
values ('project_publish_mode', '{"mode":"auto"}', now())
on conflict (key)
do update set value = excluded.value, updated_at = now();

-- 2) Projects columns used by the smart form and old pages.
alter table public.projects add column if not exists title text;
alter table public.projects add column if not exists name text;
alter table public.projects add column if not exists title_ar text;
alter table public.projects add column if not exists title_en text;
alter table public.projects add column if not exists description text;
alter table public.projects add column if not exists description_ar text;
alter table public.projects add column if not exists description_en text;
alter table public.projects add column if not exists category text default 'services';
alter table public.projects add column if not exists sector text;
alter table public.projects add column if not exists opportunity_type text default 'sale';
alter table public.projects add column if not exists project_type text;
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
alter table public.projects add column if not exists employees_count numeric default 0;
alter table public.projects add column if not exists operating_years numeric default 0;
alter table public.projects add column if not exists payback_months numeric default 0;
alter table public.projects add column if not exists phone text;
alter table public.projects add column if not exists whatsapp text;
alter table public.projects add column if not exists status text default 'approved';
alter table public.projects add column if not exists moderation_status text default 'approved';
alter table public.projects add column if not exists publish_status text default 'approved';
alter table public.projects add column if not exists approval_status text default 'auto_approved';
alter table public.projects add column if not exists verification_status text default 'pending';
alter table public.projects add column if not exists is_active boolean default true;
alter table public.projects add column if not exists is_verified boolean default false;
alter table public.projects add column if not exists cover_image_url text;
alter table public.projects add column if not exists image_url text;
alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists owner_auth_id uuid;
alter table public.projects add column if not exists user_auth_id uuid;
alter table public.projects add column if not exists owner_id uuid;
alter table public.projects add column if not exists auth_id uuid;
alter table public.projects add column if not exists user_id uuid;
alter table public.projects add column if not exists created_by uuid;
alter table public.projects add column if not exists created_at timestamptz default now();
alter table public.projects add column if not exists updated_at timestamptz default now();

-- 3) Fill old rows so NOT NULL legacy columns do not block inserts/updates.
update public.projects set
  title = coalesce(title, name, title_ar, title_en, 'مشروع'),
  name = coalesce(name, title, title_ar, title_en, 'مشروع'),
  title_ar = coalesce(title_ar, title, name, 'مشروع'),
  title_en = coalesce(title_en, title, name, 'Project'),
  description = coalesce(description, description_ar, description_en, 'تفاصيل المشروع'),
  description_ar = coalesce(description_ar, description, 'تفاصيل المشروع'),
  description_en = coalesce(description_en, description, 'Project details'),
  category = coalesce(category, sector, 'services'),
  sector = coalesce(sector, category, 'services'),
  opportunity_type = coalesce(opportunity_type, project_type, 'sale'),
  project_type = coalesce(project_type, opportunity_type, 'sale'),
  country_code = coalesce(country_code, 'om'),
  status = coalesce(status, 'approved'),
  moderation_status = coalesce(moderation_status, status, 'approved'),
  publish_status = coalesce(publish_status, status, 'approved'),
  approval_status = coalesce(approval_status, 'auto_approved'),
  verification_status = coalesce(verification_status, 'pending'),
  is_active = coalesce(is_active, true),
  is_verified = coalesce(is_verified, false),
  price = coalesce(price, 0),
  roi = coalesce(roi, 0),
  monthly_profit = coalesce(monthly_profit, 0),
  updated_at = coalesce(updated_at, now());

-- 4) Remove NOT NULL from legacy alias columns that the old schema may require incorrectly.
do $$
declare
  col text;
begin
  foreach col in array array[
    'title','name','title_ar','title_en','description','description_ar','description_en',
    'category','sector','opportunity_type','project_type','country_code','status',
    'moderation_status','publish_status','approval_status','verification_status',
    'owner_auth_id','user_auth_id','owner_id','auth_id','user_id','created_by'
  ] loop
    if exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='projects' and column_name=col and is_nullable='NO'
    ) then
      execute format('alter table public.projects alter column %I drop not null', col);
    end if;
  end loop;
end $$;

-- 5) Storage buckets used by form. Works only if storage schema is exposed/available.
insert into storage.buckets (id, name, public)
values
  ('project-images', 'project-images', true),
  ('project-documents', 'project-documents', true),
  ('verification-docs', 'verification-docs', true),
  ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- 6) Simple storage policies. Ignore duplicate errors manually if your Supabase already has policies.
do $$
begin
  begin
    create policy "Public read project files" on storage.objects
    for select using (bucket_id in ('project-images','project-documents','verification-docs','avatars'));
  exception when duplicate_object then null;
  end;

  begin
    create policy "Authenticated upload project files" on storage.objects
    for insert to authenticated
    with check (bucket_id in ('project-images','project-documents','verification-docs','avatars'));
  exception when duplicate_object then null;
  end;
end $$;

create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_moderation_status on public.projects(moderation_status);
create index if not exists idx_projects_owner_auth_id on public.projects(owner_auth_id);
create index if not exists idx_projects_user_auth_id on public.projects(user_auth_id);
