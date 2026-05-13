-- EloInvestor Next v12.6 - HTML feature parity tables
-- Run after older V12 SQL files.

alter table users
add column if not exists account_type text default 'investor',
add column if not exists subscription_status text default 'free',
add column if not exists investor_preferences jsonb default '{}'::jsonb,
add column if not exists preferred_categories text[] default '{}',
add column if not exists preferred_location text,
add column if not exists budget_min numeric default 0,
add column if not exists budget_max numeric default 0;

create table if not exists investor_saved_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(investor_auth_id, project_id)
);

alter table investor_saved_projects
add column if not exists investor_auth_id uuid,
add column if not exists project_id uuid,
add column if not exists project_snapshot jsonb default '{}'::jsonb,
add column if not exists created_at timestamptz default now();

create table if not exists investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  conversation_id uuid,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(investor_auth_id, project_id)
);

alter table investor_contacted_projects
add column if not exists investor_auth_id uuid,
add column if not exists project_id uuid,
add column if not exists conversation_id uuid,
add column if not exists project_snapshot jsonb default '{}'::jsonb,
add column if not exists created_at timestamptz default now();

create index if not exists investor_saved_projects_investor_idx on investor_saved_projects(investor_auth_id, created_at desc);
create index if not exists investor_contacted_projects_investor_idx on investor_contacted_projects(investor_auth_id, created_at desc);
create index if not exists investor_contacted_projects_conversation_idx on investor_contacted_projects(conversation_id);

create table if not exists platform_packages (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  description_ar text,
  description_en text,
  price numeric default 0,
  currency_code text default 'OMR',
  projects_limit integer default 1,
  duration_days integer default 30,
  features jsonb default '[]'::jsonb,
  target_account_type text default 'owner',
  is_active boolean default true,
  sort_order integer default 100,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table platform_packages
add column if not exists name_ar text,
add column if not exists name_en text,
add column if not exists description_ar text,
add column if not exists description_en text,
add column if not exists price numeric default 0,
add column if not exists currency_code text default 'OMR',
add column if not exists projects_limit integer default 1,
add column if not exists duration_days integer default 30,
add column if not exists features jsonb default '[]'::jsonb,
add column if not exists target_account_type text default 'owner',
add column if not exists is_active boolean default true,
add column if not exists sort_order integer default 100,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

alter table investor_saved_projects enable row level security;
alter table investor_contacted_projects enable row level security;
alter table platform_packages enable row level security;

drop policy if exists investor_saved_select_own on investor_saved_projects;
create policy investor_saved_select_own on investor_saved_projects for select to authenticated using (auth.uid() = investor_auth_id);

drop policy if exists investor_saved_insert_own on investor_saved_projects;
create policy investor_saved_insert_own on investor_saved_projects for insert to authenticated with check (auth.uid() = investor_auth_id);

drop policy if exists investor_saved_delete_own on investor_saved_projects;
create policy investor_saved_delete_own on investor_saved_projects for delete to authenticated using (auth.uid() = investor_auth_id);

drop policy if exists investor_contacted_select_own on investor_contacted_projects;
create policy investor_contacted_select_own on investor_contacted_projects for select to authenticated using (auth.uid() = investor_auth_id);

drop policy if exists investor_contacted_insert_own on investor_contacted_projects;
create policy investor_contacted_insert_own on investor_contacted_projects for insert to authenticated with check (auth.uid() = investor_auth_id);

drop policy if exists investor_contacted_update_own on investor_contacted_projects;
create policy investor_contacted_update_own on investor_contacted_projects for update to authenticated using (auth.uid() = investor_auth_id) with check (auth.uid() = investor_auth_id);

drop policy if exists packages_public_read_active on platform_packages;
create policy packages_public_read_active on platform_packages for select to anon, authenticated using (is_active = true);

drop policy if exists packages_admin_all on platform_packages;
create policy packages_admin_all on platform_packages for all to authenticated using (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.role in ('admin','super_admin'))
) with check (
  exists (select 1 from users u where u.auth_id = auth.uid() and u.role in ('admin','super_admin'))
);

insert into platform_packages (name_ar, name_en, description_ar, price, projects_limit, duration_days, target_account_type, sort_order)
values
('باقة البداية', 'Starter', 'نشر مشروع واحد مع مراجعة أساسية.', 10, 1, 30, 'owner', 1),
('باقة النمو', 'Growth', 'نشر مشروعين مع ظهور أفضل وإحصائيات.', 18, 2, 45, 'owner', 2),
('مستثمر بريميوم', 'Premium Investor', 'ترشيحات أذكى ومتابعة فرص محفوظة.', 8, 0, 30, 'investor', 3)
on conflict do nothing;

notify pgrst, 'reload schema';
