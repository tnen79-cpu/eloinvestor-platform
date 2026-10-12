-- v53 Security + stability hardening for Alo Investor
-- Run after previous migrations.

-- 1) Notifications compatibility: support both message and body.
alter table if exists public.notifications add column if not exists message text;
alter table if exists public.notifications add column if not exists body text;
update public.notifications set message = coalesce(message, body) where message is null and body is not null;
update public.notifications set body = coalesce(body, message) where body is null and message is not null;

-- 2) Ads optional title/button/description and no required demo copy.
alter table if exists public.platform_ads alter column title drop not null;
alter table if exists public.platform_ads alter column button_text drop not null;
alter table if exists public.platform_ads alter column description drop not null;

-- 3) Atomic counters. Avoid read-then-write race conditions.
alter table if exists public.projects add column if not exists views_count integer default 0;
alter table if exists public.projects add column if not exists contacts_count integer default 0;
alter table if exists public.projects add column if not exists saves_count integer default 0;
alter table if exists public.projects add column if not exists interests_count integer default 0;

create or replace function public.increment_project_counter(p_project_id uuid, p_field text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_field not in ('views_count','contacts_count','saves_count','interests_count') then
    raise exception 'Invalid counter field: %', p_field;
  end if;

  if p_field = 'views_count' then
    update public.projects set views_count = coalesce(views_count, 0) + 1 where id = p_project_id;
  elsif p_field = 'contacts_count' then
    update public.projects set contacts_count = coalesce(contacts_count, 0) + 1 where id = p_project_id;
  elsif p_field = 'saves_count' then
    update public.projects set saves_count = coalesce(saves_count, 0) + 1 where id = p_project_id;
  elsif p_field = 'interests_count' then
    update public.projects set interests_count = coalesce(interests_count, 0) + 1 where id = p_project_id;
  end if;
end;
$$;

grant execute on function public.increment_project_counter(uuid, text) to anon, authenticated;

-- 4) Atomic project credit consumption.
create or replace function public.consume_project_credit(p_auth_id uuid default auth.uid())
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if p_auth_id is distinct from auth.uid() then
    raise exception 'Cannot consume another account credit';
  end if;

  update public.users
  set remaining_projects = greatest(coalesce(remaining_projects, 0) - 1, 0),
      free_project_used = true
  where auth_id = p_auth_id
    and coalesce(remaining_projects, 0) > 0;

  get diagnostics affected = row_count;
  if affected = 0 then
    raise exception 'No remaining project credits';
  end if;
end;
$$;

revoke all on function public.consume_project_credit(uuid) from public, anon;
grant execute on function public.consume_project_credit(uuid) to authenticated;

-- 5) RLS hardening for users.
alter table if exists public.users enable row level security;

drop policy if exists "Users can read own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Admins can read users" on public.users;
drop policy if exists "Admins can update users" on public.users;

create policy "Users can read own profile"
on public.users
for select
to authenticated
using (auth_id = auth.uid());

create policy "Users can insert own profile"
on public.users
for insert
to authenticated
with check (auth_id = auth.uid());

create policy "Users can update own profile"
on public.users
for update
to authenticated
using (auth_id = auth.uid())
with check (auth_id = auth.uid());

create policy "Admins can read users"
on public.users
for select
to authenticated
using (
  exists (
    select 1 from public.admin_staff s
    where s.auth_id = auth.uid()
      and coalesce(s.is_active, true) = true
  )
);

create policy "Admins can update users"
on public.users
for update
to authenticated
using (
  exists (
    select 1 from public.admin_staff s
    where s.auth_id = auth.uid()
      and coalesce(s.is_active, true) = true
  )
)
with check (
  exists (
    select 1 from public.admin_staff s
    where s.auth_id = auth.uid()
      and coalesce(s.is_active, true) = true
  )
);

-- 6) project_interests policy without referencing non-existing columns.
do $$
begin
  if to_regclass('public.project_interests') is not null then
    execute 'alter table public.project_interests enable row level security';
    execute 'drop policy if exists "Investors can manage own interests" on public.project_interests';
    execute 'drop policy if exists "Owners can read interests on their projects" on public.project_interests';
    execute 'create policy "Investors can manage own interests" on public.project_interests for all to authenticated using (investor_auth_id = auth.uid()) with check (investor_auth_id = auth.uid())';
    execute 'create policy "Owners can read interests on their projects" on public.project_interests for select to authenticated using (exists (select 1 from public.projects p where p.id = project_interests.project_id and p.owner_auth_id = auth.uid()))';
  end if;
end $$;

-- 7) Make saved projects safe if table exists.
do $$
begin
  if to_regclass('public.investor_saved_projects') is not null then
    execute 'alter table public.investor_saved_projects enable row level security';
    execute 'drop policy if exists "Investors can manage own saved projects" on public.investor_saved_projects';
    execute 'create policy "Investors can manage own saved projects" on public.investor_saved_projects for all to authenticated using (investor_auth_id = auth.uid()) with check (investor_auth_id = auth.uid())';
  end if;
end $$;
