-- إلو مستثمر v16 - Admin Staff + Permissions + Activity Logs
-- شغّل هذا الملف في Supabase SQL Editor بعد ملفات v11/v12/v13/v14/v15.
-- مهم: بعد التشغيل، اجعل أول حساب مدير بتحديث جدول users: update public.users set role='admin' where email='YOUR_EMAIL';

alter table public.users
  add column if not exists role text default 'user',
  add column if not exists is_blocked boolean default false,
  add column if not exists admin_note text;

create table if not exists public.admin_staff (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique,
  name text not null,
  email text,
  role text not null default 'support',
  permissions text[] not null default '{}',
  is_active boolean not null default true,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.admin_activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_auth_id uuid,
  action text not null,
  target_table text,
  target_id text,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid,
  title text not null,
  message text not null,
  type text default 'info',
  is_read boolean default false,
  created_by uuid,
  created_at timestamptz default now()
);

create or replace function public.is_admin_staff(required_permission text default null)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return false;
  end if;

  -- Legacy super admin from users.role
  if exists (
    select 1 from public.users u
    where u.auth_id = uid
      and lower(coalesce(u.role, 'user')) = 'admin'
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.admin_staff s
    where s.auth_id = uid
      and s.is_active = true
      and (
        s.role = 'super_admin'
        or required_permission is null
        or '*' = any(s.permissions)
        or required_permission = any(s.permissions)
      )
  );
end;
$$;

alter table public.admin_staff enable row level security;
alter table public.admin_activity_logs enable row level security;
alter table public.notifications enable row level security;

-- ADMIN STAFF

drop policy if exists "staff can read own admin account" on public.admin_staff;
create policy "staff can read own admin account"
on public.admin_staff
for select
using (auth.uid() = auth_id or public.is_admin_staff('staff'));

drop policy if exists "super admins can create staff" on public.admin_staff;
create policy "super admins can create staff"
on public.admin_staff
for insert
with check (public.is_admin_staff('staff'));

drop policy if exists "super admins can update staff" on public.admin_staff;
create policy "super admins can update staff"
on public.admin_staff
for update
using (public.is_admin_staff('staff'))
with check (public.is_admin_staff('staff'));

-- LOGS

drop policy if exists "admins can read activity logs" on public.admin_activity_logs;
create policy "admins can read activity logs"
on public.admin_activity_logs
for select
using (public.is_admin_staff('logs'));

drop policy if exists "admins can insert activity logs" on public.admin_activity_logs;
create policy "admins can insert activity logs"
on public.admin_activity_logs
for insert
with check (public.is_admin_staff(null));

-- NOTIFICATIONS

drop policy if exists "users can read own notifications" on public.notifications;
create policy "users can read own notifications"
on public.notifications
for select
using (user_auth_id is null or user_auth_id = auth.uid() or public.is_admin_staff('notifications'));

drop policy if exists "admins can create notifications" on public.notifications;
create policy "admins can create notifications"
on public.notifications
for insert
with check (public.is_admin_staff('notifications'));

drop policy if exists "users can update own notifications" on public.notifications;
create policy "users can update own notifications"
on public.notifications
for update
using (user_auth_id = auth.uid() or public.is_admin_staff('notifications'))
with check (user_auth_id = auth.uid() or public.is_admin_staff('notifications'));

-- USERS: allow admin panel to read/update users without recursive users policy

drop policy if exists "admins can read all users" on public.users;
create policy "admins can read all users"
on public.users
for select
using (public.is_admin_staff('users') or public.is_admin_staff('staff') or public.is_admin_staff('overview'));

drop policy if exists "admins can update users" on public.users;
create policy "admins can update users"
on public.users
for update
using (public.is_admin_staff('users') or public.is_admin_staff('plans'))
with check (public.is_admin_staff('users') or public.is_admin_staff('plans'));

-- PROJECTS: admin review actions

drop policy if exists "admins can read all projects" on public.projects;
create policy "admins can read all projects"
on public.projects
for select
using (public.is_admin_staff('projects') or public.is_admin_staff('overview'));

drop policy if exists "admins can update projects" on public.projects;
create policy "admins can update projects"
on public.projects
for update
using (public.is_admin_staff('projects'))
with check (public.is_admin_staff('projects'));

drop policy if exists "admins can delete projects" on public.projects;
create policy "admins can delete projects"
on public.projects
for delete
using (public.is_admin_staff('projects'));

-- VERIFICATION REQUESTS: optional, works if the table exists
-- إذا ظهر خطأ أن verification_requests غير موجود، تجاهل هذا القسم أو أنشئ الجدول من ملف التوثيق السابق.

do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='verification_requests') then
    alter table public.verification_requests enable row level security;

    drop policy if exists "admins can read verification requests" on public.verification_requests;
    create policy "admins can read verification requests"
    on public.verification_requests
    for select
    using (public.is_admin_staff('verification'));

    drop policy if exists "admins can update verification requests" on public.verification_requests;
    create policy "admins can update verification requests"
    on public.verification_requests
    for update
    using (public.is_admin_staff('verification'))
    with check (public.is_admin_staff('verification'));
  end if;
end $$;

-- أول مدير: بعد تشغيل الملف، نفذ هذا السطر مع بريدك الحقيقي:
-- update public.users set role = 'admin' where email = 'YOUR_EMAIL@gmail.com';
