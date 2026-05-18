-- v88 Firebase Admin Final SQL
alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists profile_completed boolean default false;
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists admin_status text default 'active';
create index if not exists idx_users_firebase_uid on public.users(firebase_uid);
create index if not exists idx_users_email_lower on public.users(lower(email));

-- بعد تسجيل الدخول بجوجل/الهاتف، ضع Firebase UID الحقيقي هنا ثم شغّل هذا السطر بتعديل القيم:
-- update public.users set firebase_uid='PUT_FIREBASE_UID_HERE', role='admin', admin_role='admin', is_admin=true, admin_status='active', account_type='both' where lower(email)=lower('YOUR_ADMIN_EMAIL_HERE');
