-- v85 Auth Onboarding
-- بعد أول تسجيل دخول عبر Firebase Phone/Google، يجبر المستخدم الجديد على اختيار الاسم ونوع الحساب.

alter table public.users
add column if not exists firebase_uid text;

alter table public.users
add column if not exists onboarding_completed boolean default false;

alter table public.users
add column if not exists profile_completed boolean default false;

alter table public.users
add column if not exists display_name text;

alter table public.users
add column if not exists phone_country_code text;

alter table public.users
add column if not exists provider text default 'firebase';

-- اعتبر الحسابات القديمة مكتملة حتى لا يتم حجز المستخدمين الحاليين في شاشة الإكمال.
update public.users
set onboarding_completed = true,
    profile_completed = true
where onboarding_completed is null
   or profile_completed is null;

-- مزامنة display_name مع name للحسابات القديمة.
update public.users
set display_name = coalesce(display_name, name)
where display_name is null;

create index if not exists idx_users_firebase_uid on public.users(firebase_uid);
create index if not exists idx_users_onboarding_completed on public.users(onboarding_completed);
