-- v87 Firebase Admin + Onboarding final safe SQL
-- شغّل هذا الملف مرة واحدة بعد رفع النسخة.

alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists profile_completed boolean default false;
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_status text default 'active';

-- لا نضع unique على firebase_uid حتى لا يكسر بياناتك الحالية، فقط index للسرعة.
create index if not exists idx_users_firebase_uid on public.users(firebase_uid);
create index if not exists idx_users_email_lower on public.users(lower(email));

-- إذا عندك أكثر من صف لنفس firebase_uid، خلي الصف الإداري هو المعتمد وانزع firebase_uid من الصفوف غير الإدارية المكررة.
with ranked as (
  select
    id,
    firebase_uid,
    row_number() over (
      partition by firebase_uid
      order by
        case when is_admin = true or role in ('admin','super_admin') or admin_role in ('admin','super_admin') then 0 else 1 end,
        created_at asc nulls last
    ) as rn
  from public.users
  where firebase_uid is not null and firebase_uid <> ''
)
update public.users u
set firebase_uid = null
from ranked r
where u.id = r.id
  and r.rn > 1;
