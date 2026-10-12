-- v75: public listings omit contact information and internal review data.
begin;
alter table public.projects enable row level security;
drop policy if exists "v75_project_visibility" on public.projects;
create policy "v75_project_visibility" on public.projects as restrictive for select to public
using(status in ('approved','active','published') or (auth.uid() is not null and (owner_auth_id=auth.uid() or public.is_admin_staff('projects') or public.is_admin_staff('overview'))));
drop policy if exists "v75_project_read" on public.projects;
create policy "v75_project_read" on public.projects for select to anon,authenticated
using(status in ('approved','active','published') or owner_auth_id=auth.uid() or public.is_admin_staff('projects') or public.is_admin_staff('overview'));
create or replace view public.marketplace_projects with(security_invoker=true) as
select id,title,description,category,type,price,monthly_profit,location,image_url,status,verification_status,views_count,contacts_count,created_at,owner_auth_id from public.projects;
revoke select on public.projects from public,anon;
grant select(id,title,description,category,type,price,monthly_profit,location,image_url,status,verification_status,views_count,contacts_count,created_at,owner_auth_id) on public.projects to anon;
grant select on public.projects to authenticated;
grant select on public.marketplace_projects to anon,authenticated;
create or replace function public.project_contact_v75(project_key uuid)
returns jsonb language plpgsql security invoker set search_path=pg_catalog,public as $$
declare p public.projects%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign-in required';end if;
 if exists(select 1 from public.users where auth_id=auth.uid() and is_blocked) then raise exception 'Account blocked';end if;
 select * into p from public.projects where id=project_key;
 if not found then raise exception 'Project unavailable';end if;
 return jsonb_build_object('whatsapp',p.whatsapp);
end $$;
revoke all on function public.project_contact_v75(uuid) from public,anon;
grant execute on function public.project_contact_v75(uuid) to authenticated;
commit;
