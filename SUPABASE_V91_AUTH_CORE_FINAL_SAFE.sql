-- EloInvestor v91 Auth Core Final Safe SQL
-- Firebase Auth is used only for login. Supabase users table is the source of roles/account_type.

alter table public.users add column if not exists firebase_uid text;
alter table public.users add column if not exists account_type text default 'investor';
alter table public.users add column if not exists type text;
alter table public.users add column if not exists role text default 'user';
alter table public.users add column if not exists is_admin boolean default false;
alter table public.users add column if not exists admin_role text;
alter table public.users add column if not exists admin_status text default 'active';
alter table public.users add column if not exists onboarding_completed boolean default false;
alter table public.users add column if not exists profile_completed boolean default false;
alter table public.users add column if not exists display_name text;
alter table public.users add column if not exists updated_at timestamptz default now();

update public.users
set account_type = case
  when lower(coalesce(account_type, type, 'investor')) in ('owner','seller','project_owner','صاحب مشروع','صاحب_مشروع') then 'owner'
  when lower(coalesce(account_type, type, 'investor')) in ('both','owner_investor','investor_owner','مستثمر وصاحب مشروع','مستثمر_وصاحب_مشروع') then 'both'
  else 'investor'
end
where account_type is null or account_type not in ('investor','owner','both');

update public.users set type = coalesce(type, account_type) where type is null;
update public.users set role = coalesce(role, 'user') where role is null;
update public.users set admin_status = coalesce(admin_status, 'active') where admin_status is null;
update public.users set display_name = coalesce(display_name, name) where display_name is null;

-- Keep only one firebase_uid owner when duplicates exist, but do not delete rows.
-- This index is partial so old null rows are allowed.
do $$
begin
  if not exists (select 1 from pg_indexes where schemaname='public' and indexname='idx_users_firebase_uid_unique') then
    create unique index idx_users_firebase_uid_unique on public.users(firebase_uid) where firebase_uid is not null;
  end if;
exception when others then
  -- If duplicates already exist, leave them; the API now syncs all matching rows.
  null;
end $$;

-- Optional helper: promote an existing Firebase UID to admin.
create or replace function public.promote_firebase_admin(p_firebase_uid text, p_email text default null, p_name text default 'Admin')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set firebase_uid = p_firebase_uid,
      email = coalesce(email, p_email),
      name = coalesce(nullif(name,''), p_name),
      display_name = coalesce(nullif(display_name,''), p_name),
      role = 'admin',
      admin_role = coalesce(admin_role, 'admin'),
      is_admin = true,
      admin_status = 'active',
      account_type = 'both',
      type = 'both',
      onboarding_completed = true,
      profile_completed = true,
      updated_at = now()
  where firebase_uid = p_firebase_uid
     or (p_email is not null and lower(email) = lower(p_email));

  if not found then
    insert into public.users(firebase_uid,email,name,display_name,role,admin_role,is_admin,admin_status,account_type,type,onboarding_completed,profile_completed,updated_at)
    values (p_firebase_uid,p_email,p_name,p_name,'admin','admin',true,'active','both','both',true,true,now());
  end if;
end;
$$;
