-- EloInvestor v91 Supabase-only Auth
-- شغّل هذا الملف بعد نشر نسخة v91 لإزالة آثار Firebase وتوحيد الدخول على Supabase Auth فقط.

alter table public.users add column if not exists auth_id uuid;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists provider text default 'supabase';
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists profile_completed boolean default false;

-- نقل أي ربط قديم صالح UUID فقط من firebase_uid إلى auth_id قبل الحذف.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'firebase_uid'
  ) then
    update public.users
    set auth_id = firebase_uid::uuid
    where auth_id is null
      and firebase_uid ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
  end if;
end $$;

-- إزالة عمود Firebase نهائياً بعد التحويل.
alter table public.users drop column if exists firebase_uid;

create unique index if not exists users_auth_id_unique on public.users(auth_id) where auth_id is not null;
create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_users_email_lower on public.users(lower(email));

alter table public.users enable row level security;

drop policy if exists "Users can view own profile" on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;

create policy "Users can view own profile"
on public.users
for select
using (auth.uid() = auth_id);

create policy "Users can insert own profile"
on public.users
for insert
with check (auth.uid() = auth_id);

create policy "Users can update own profile"
on public.users
for update
using (auth.uid() = auth_id)
with check (auth.uid() = auth_id);
