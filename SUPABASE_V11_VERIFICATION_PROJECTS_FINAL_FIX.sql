
-- EloInvestor Next v11 - Verification projects query final schema fix
-- هذا الملف يثبت جدول التوثيق ويخلي صفحة توثيق المشاريع تقرأ مشاريع المستخدم من projects.user_id

create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid()
);

alter table verification_requests
add column if not exists user_auth_id uuid,
add column if not exists user_id uuid,
add column if not exists project_id uuid,
add column if not exists project_title text,
add column if not exists request_type text default 'project',
add column if not exists type text default 'project',
add column if not exists status text default 'pending',
add column if not exists full_name text,
add column if not exists company_name text,
add column if not exists document_type text,
add column if not exists document_url text,
add column if not exists notes text,
add column if not exists note text,
add column if not exists admin_note text,
add column if not exists country_code text default 'om',
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

-- جدول projects الحقيقي عندك يستخدم user_id. نخلي الأعمدة الأخرى اختيارية للتوافق فقط.
alter table projects
add column if not exists owner_auth_id uuid,
add column if not exists user_auth_id uuid,
add column if not exists is_verified boolean default false;

update projects
set owner_auth_id = user_id
where owner_auth_id is null and user_id is not null;

update projects
set user_auth_id = user_id
where user_auth_id is null and user_id is not null;

-- توحيد الطلبات القديمة
update verification_requests
set user_id = user_auth_id
where user_id is null and user_auth_id is not null;

update verification_requests
set user_auth_id = user_id
where user_auth_id is null and user_id is not null;

alter table users
add column if not exists is_verified_investor boolean default false,
add column if not exists role text default 'user';

alter table verification_requests enable row level security;

drop policy if exists "users_insert_verification_requests" on verification_requests;
create policy "users_insert_verification_requests"
on verification_requests
for insert
to authenticated
with check (
  auth.uid() = user_auth_id or auth.uid() = user_id
);

drop policy if exists "users_read_own_verification_requests" on verification_requests;
create policy "users_read_own_verification_requests"
on verification_requests
for select
to authenticated
using (
  auth.uid() = user_auth_id or auth.uid() = user_id
);

drop policy if exists "admins_read_all_verification_requests" on verification_requests;
create policy "admins_read_all_verification_requests"
on verification_requests
for select
to authenticated
using (
  exists (
    select 1 from users
    where users.auth_id = auth.uid()
    and users.role = 'admin'
  )
);

drop policy if exists "admins_update_verification_requests" on verification_requests;
create policy "admins_update_verification_requests"
on verification_requests
for update
to authenticated
using (
  exists (
    select 1 from users
    where users.auth_id = auth.uid()
    and users.role = 'admin'
  )
)
with check (
  exists (
    select 1 from users
    where users.auth_id = auth.uid()
    and users.role = 'admin'
  )
);

notify pgrst, 'reload schema';
