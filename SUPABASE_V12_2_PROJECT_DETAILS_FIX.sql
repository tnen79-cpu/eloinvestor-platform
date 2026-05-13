-- V12.2 Project details visibility fix
-- Run this in Supabase SQL Editor.

-- Projects must be readable by visitors when approved, otherwise project details will 404.
alter table projects enable row level security;

drop policy if exists "public_read_approved_projects" on projects;
create policy "public_read_approved_projects"
on projects
for select
to anon, authenticated
using (
  coalesce(status, 'approved') = 'approved'
);

-- Project owners can read their own projects even if pending/rejected.
drop policy if exists "users_read_own_projects" on projects;
create policy "users_read_own_projects"
on projects
for select
to authenticated
using (
  auth.uid() = user_id
  or auth.uid() = owner_auth_id
  or auth.uid() = user_auth_id
);

-- Admins can read all projects.
drop policy if exists "admins_read_all_projects" on projects;
create policy "admins_read_all_projects"
on projects
for select
to authenticated
using (
  exists (
    select 1
    from users
    where users.auth_id = auth.uid()
      and users.role = 'admin'
  )
);

-- Project images need public read for cards/details gallery.
alter table project_images enable row level security;

drop policy if exists "public_read_project_images" on project_images;
create policy "public_read_project_images"
on project_images
for select
to anon, authenticated
using (true);

-- Make sure schema cache is fresh.
notify pgrst, 'reload schema';
