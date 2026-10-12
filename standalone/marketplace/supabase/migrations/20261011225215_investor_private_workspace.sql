-- Private investor data and account privilege hardening.
-- Apply after the existing v16 and v53 schema. Additive guards preserve existing policies.
begin;
do $$
begin
  if to_regclass('public.users') is null or to_regclass('public.investor_saved_projects') is null
     or to_regprocedure('public.is_admin_staff(text)') is null then
    raise exception 'Required v16/v53 tables and admin authorization helper are missing';
  end if;
end $$;
alter table public.users enable row level security;
alter table public.investor_saved_projects enable row level security;

-- Restrictive guards also constrain legacy permissive policies.
drop policy if exists "v74_users_private_guard" on public.users;
create policy "v74_users_private_guard" on public.users as restrictive for all to public
using (auth.uid() is not null and (auth_id=auth.uid() or public.is_admin_staff('users') or public.is_admin_staff('plans')))
with check (auth.uid() is not null and (auth_id=auth.uid() or public.is_admin_staff('users') or public.is_admin_staff('plans')));
drop policy if exists "v74_users_self_access" on public.users;
create policy "v74_users_self_access" on public.users for all to authenticated
using (auth_id=auth.uid()) with check (auth_id=auth.uid());

drop policy if exists "v74_saved_private_guard" on public.investor_saved_projects;
create policy "v74_saved_private_guard" on public.investor_saved_projects as restrictive for all to public
using (auth.uid() is not null and investor_auth_id=auth.uid())
with check (auth.uid() is not null and investor_auth_id=auth.uid());
drop policy if exists "v74_saved_self_access" on public.investor_saved_projects;
create policy "v74_saved_self_access" on public.investor_saved_projects for all to authenticated
using (investor_auth_id=auth.uid()) with check (investor_auth_id=auth.uid());

-- Owning a profile must not permit assigning admin roles, credits or paid plans.
create or replace function public.v74_protect_profile_fields()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare
  profile_fields text[]:=array['name','email','phone','whatsapp','account_type','investor_preferences','preferred_categories','preferred_location','budget_min','budget_max','verification_status','updated_at'];
  billing_fields text[]:=array['plan','subscription_status','remaining_projects','free_project_used','plan_expires_at','subscription_end'];
  n jsonb:=to_jsonb(new);
begin
  -- Trusted database jobs and credit RPCs run as the owner; users cannot adopt this role through the API.
  if current_user in ('postgres','supabase_admin','service_role') then return new; end if;
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if public.is_admin_staff('users') then return new; end if;
  if tg_op='INSERT' then
    if coalesce(n->>'role','user')<>'user'
       or coalesce(n->>'plan','free')<>'free'
       or coalesce(n->>'subscription_status','free')<>'free'
       or coalesce((n->>'remaining_projects')::numeric,0)>1
       or coalesce((n->>'featured_projects')::numeric,0)>0
       or coalesce(n->>'verification_status','not_verified') not in ('not_verified','pending')
       or coalesce((n->>'is_blocked')::boolean,false) then
      raise exception 'Reserved account fields cannot be assigned by this account';
    end if;
  elsif public.is_admin_staff('plans') then
    if (n-billing_fields-array['updated_at']) is distinct from (to_jsonb(old)-billing_fields-array['updated_at']) then
      raise exception 'Billing permission does not allow changing account roles or personal data';
    end if;
  else
    if (n-profile_fields) is distinct from (to_jsonb(old)-profile_fields) then
      raise exception 'Reserved account fields cannot be changed by this account';
    end if;
    if new.verification_status is distinct from old.verification_status
       and new.verification_status not in ('pending','not_verified') then
      raise exception 'Verification approval requires administration';
    end if;
  end if;
  return new;
end $$;
revoke all on function public.v74_protect_profile_fields() from public,anon,authenticated;
drop trigger if exists v74_profile_fields_guard on public.users;
create trigger v74_profile_fields_guard before insert or update on public.users
for each row execute function public.v74_protect_profile_fields();

-- Keep the existing API signature, but never let its caller choose another account.
create or replace function public.consume_project_credit(p_auth_id uuid default auth.uid())
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare affected integer;
begin
  if auth.uid() is null or p_auth_id is distinct from auth.uid() then
    raise exception 'Credit consumption is restricted to the current account';
  end if;
  update public.users set remaining_projects=greatest(coalesce(remaining_projects,0)-1,0),free_project_used=true
  where auth_id=auth.uid() and coalesce(remaining_projects,0)>0 and not coalesce(is_blocked,false);
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'No available project credit'; end if;
end $$;
revoke all on function public.consume_project_credit(uuid) from public,anon;
grant execute on function public.consume_project_credit(uuid) to authenticated;

-- Clients refuse private writes until these guards exist. This exposes only a boolean, never account data.
create or replace function public.marketplace_security_ready()
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select
  exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='users' and c.relrowsecurity)
  and exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='investor_saved_projects' and c.relrowsecurity)
  and exists(select 1 from pg_policies where schemaname='public' and tablename='users' and policyname='v74_users_private_guard' and permissive='RESTRICTIVE')
  and exists(select 1 from pg_policies where schemaname='public' and tablename='investor_saved_projects' and policyname='v74_saved_private_guard' and permissive='RESTRICTIVE')
  and exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='users' and t.tgname='v74_profile_fields_guard' and t.tgenabled in ('O','A'));
$$;
revoke all on function public.marketplace_security_ready() from public,anon;
grant execute on function public.marketplace_security_ready() to authenticated;
commit;
