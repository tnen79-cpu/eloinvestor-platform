-- v85.1 Firebase Admin/Profile compatibility
-- شغّل هذا الملف بعد v85 حتى تدعم الإدارة والبروفايل حسابات Firebase UID.

alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists profile_completed boolean default false;
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists name text;
alter table public.users add column if not exists email text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists updated_at timestamptz default now();

create unique index if not exists users_firebase_uid_unique
on public.users(firebase_uid)
where firebase_uid is not null;

create index if not exists users_email_idx on public.users(email);

-- بعد تسجيل دخولك بجوجل/الهاتف انسخ Firebase UID من شاشة auth أو auth.users إن وجد، ثم نفذ:
-- update public.users set firebase_uid='FIREBASE_UID_HERE', role='admin', account_type='both', onboarding_completed=true, profile_completed=true where email='YOUR_ADMIN_EMAIL';
-- إذا لم يوجد صف:
-- insert into public.users(firebase_uid,email,name,role,account_type,onboarding_completed,profile_completed) values('FIREBASE_UID_HERE','YOUR_ADMIN_EMAIL','Admin','admin','both',true,true);
