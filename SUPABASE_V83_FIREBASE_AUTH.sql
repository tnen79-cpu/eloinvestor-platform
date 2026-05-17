-- =========================================================
-- EloInvestor v83 Firebase Auth Bridge
-- يشغل دخول الهاتف وجوجل عبر Firebase مع بقاء Supabase للبيانات والتخزين
-- =========================================================

alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists phone text;
alter table public.users add column if not exists phone_country_code text;
alter table public.users add column if not exists provider text;
alter table public.users add column if not exists avatar_url text;
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists updated_at timestamptz default now();

update public.users
set firebase_uid = coalesce(firebase_uid, auth_id::text)
where firebase_uid is null and auth_id is not null;

-- تنظيف تكرار firebase_uid قبل إضافة unique
with duplicates as (
  select firebase_uid, min(ctid) as keep_ctid
  from public.users
  where firebase_uid is not null and firebase_uid <> ''
  group by firebase_uid
  having count(*) > 1
)
delete from public.users u
using duplicates d
where u.firebase_uid = d.firebase_uid
  and u.ctid <> d.keep_ctid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'users_firebase_uid_unique'
  ) then
    alter table public.users add constraint users_firebase_uid_unique unique (firebase_uid);
  end if;
exception when others then
  raise notice 'Skipping users_firebase_uid_unique: %', sqlerrm;
end $$;

create index if not exists idx_users_firebase_uid on public.users(firebase_uid);
create index if not exists idx_users_phone on public.users(phone);

-- RLS مؤقت آمن للقراءة الأساسية، أما إنشاء/تحديث الحساب يتم عبر API service role
alter table public.users enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='users_public_read_profiles'
  ) then
    create policy users_public_read_profiles on public.users
    for select using (true);
  end if;
end $$;
