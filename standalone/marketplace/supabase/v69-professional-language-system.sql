
-- v69 Professional Language System
-- Clean i18n system inspired by professional SaaS dashboards.

create table if not exists public.platform_languages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  native_name text,
  direction text not null default 'ltr' check (direction in ('rtl','ltr')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order int not null default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into public.platform_languages (code, name, native_name, direction, is_default, is_active, sort_order)
values
  ('ar', 'Arabic', 'العربية', 'rtl', true, true, 1),
  ('en', 'English', 'English', 'ltr', false, true, 2)
on conflict (code) do update set
  name = excluded.name,
  native_name = excluded.native_name,
  direction = excluded.direction,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

create table if not exists public.ui_translation_keys (
  id uuid primary key default gen_random_uuid(),
  translation_key text not null unique,
  source_text text not null,
  group_name text default 'general',
  page_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.ui_translations (
  id uuid primary key default gen_random_uuid(),
  translation_key text not null references public.ui_translation_keys(translation_key) on delete cascade,
  language_code text not null references public.platform_languages(code) on delete cascade,
  translated_text text,
  status text not null default 'draft' check (status in ('draft','ready')),
  translated_by text default 'manual',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (translation_key, language_code)
);

create table if not exists public.project_translations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  language_code text not null references public.platform_languages(code) on delete cascade,
  title text,
  description text,
  location text,
  category text,
  sector text,
  opportunity_type text,
  translated_by text default 'auto',
  status text default 'ready',
  reviewed_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(project_id, language_code)
);

alter table public.platform_languages enable row level security;
alter table public.ui_translation_keys enable row level security;
alter table public.ui_translations enable row level security;
alter table public.project_translations enable row level security;

drop policy if exists "public read languages" on public.platform_languages;
drop policy if exists "authenticated manage languages" on public.platform_languages;
create policy "public read languages" on public.platform_languages for select using (true);
create policy "authenticated manage languages" on public.platform_languages for all to authenticated using (true) with check (true);

drop policy if exists "public read translation keys" on public.ui_translation_keys;
drop policy if exists "authenticated manage translation keys" on public.ui_translation_keys;
create policy "public read translation keys" on public.ui_translation_keys for select using (true);
create policy "authenticated manage translation keys" on public.ui_translation_keys for all to authenticated using (true) with check (true);

drop policy if exists "public read ui translations" on public.ui_translations;
drop policy if exists "authenticated manage ui translations" on public.ui_translations;
create policy "public read ui translations" on public.ui_translations for select using (true);
create policy "authenticated manage ui translations" on public.ui_translations for all to authenticated using (true) with check (true);

drop policy if exists "public read project translations" on public.project_translations;
drop policy if exists "authenticated manage project translations" on public.project_translations;
create policy "public read project translations" on public.project_translations for select using (true);
create policy "authenticated manage project translations" on public.project_translations for all to authenticated using (true) with check (true);
