# EloInvestor Next v9 — Verification System

## ما الجديد؟

- صفحة توثيق للمستخدم: `/{country}/{lang}/verification`
- توثيق مشروع: رفع سجل تجاري / إثبات ملكية / مستندات
- توثيق مستثمر: رفع هوية / إثبات مالي / كشف حساب
- صفحة إدارة طلبات التوثيق: `/admin/verifications`
- قبول / رفض / طلب تعديل مع ملاحظات الإدارة
- عند قبول توثيق مشروع يتم تحديث `projects.is_verified = true`
- عند قبول توثيق مستثمر يتم تحديث `users.is_verified = true`

---

## 1) أنشئ Storage Bucket

Supabase → Storage → New bucket

```txt
verification-files
```

يفضل جعله Public في هذه المرحلة.

---

## 2) شغّل SQL

```sql
create table if not exists verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  request_type text not null check (request_type in ('project','investor')),
  project_id uuid null,
  project_title text,
  country_code text default 'om',
  status text default 'pending' check (status in ('pending','approved','rejected','revision')),
  document_url text,
  note text,
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

alter table verification_requests enable row level security;

-- المستخدم يرى طلباته فقط
create policy if not exists "users_read_own_verification_requests"
on verification_requests
for select
to authenticated
using (user_auth_id = auth.uid());

-- المستخدم ينشئ طلباته فقط
create policy if not exists "users_insert_own_verification_requests"
on verification_requests
for insert
to authenticated
with check (user_auth_id = auth.uid());

-- الأدمن يرى كل الطلبات
create policy if not exists "admins_read_verification_requests"
on verification_requests
for select
to authenticated
using (
  exists (
    select 1 from users
    where (users.auth_id = auth.uid() or users.id = auth.uid())
    and users.role in ('admin','super_admin','owner')
  )
);

-- الأدمن يعدل الطلبات
create policy if not exists "admins_update_verification_requests"
on verification_requests
for update
to authenticated
using (
  exists (
    select 1 from users
    where (users.auth_id = auth.uid() or users.id = auth.uid())
    and users.role in ('admin','super_admin','owner')
  )
)
with check (
  exists (
    select 1 from users
    where (users.auth_id = auth.uid() or users.id = auth.uid())
    and users.role in ('admin','super_admin','owner')
  )
);

alter table projects add column if not exists is_verified boolean default false;
alter table projects add column if not exists verification_status text default 'none';
alter table users add column if not exists is_verified boolean default false;
alter table users add column if not exists verification_status text default 'none';

notify pgrst, 'reload schema';
```

> إذا ظهر خطأ `create policy if not exists`، احذف `if not exists` أو استخدم `drop policy if exists ...` قبل إنشاء السياسة.

---

## 3) تأكد أن حسابك Admin

```sql
alter table users add column if not exists role text default 'user';

update users
set role = 'admin'
where email = 'ايميلك';
```

---

## 4) التشغيل

```bash
npm install
npm run dev
```

افتح:

```txt
http://localhost:3000/om/ar/verification
http://localhost:3000/admin/verifications
```
