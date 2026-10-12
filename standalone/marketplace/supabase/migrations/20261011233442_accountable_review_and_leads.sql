-- v76: audited review decisions, document resubmission and consent-based leads.
begin;
create schema if not exists private;
alter table public.projects add column if not exists review_revision integer not null default 0;
alter table public.verification_files add column if not exists review_revision integer not null default 0,add column if not exists is_current boolean not null default true,add column if not exists supersedes_file_id uuid;

create or replace function private.v76_verification_state(project_key uuid,owner_key uuid)
returns text language sql stable security invoker set search_path=pg_catalog,public as $$
 select case when count(*)=0 then 'not_verified'
 when bool_and(status='verified') then 'verified'
 when bool_or(status='suspicious') then 'suspicious'
 when bool_or(status in ('rejected','needs_documents','expired')) then 'needs_documents'
 else 'pending' end
 from public.verification_files where is_current and ((project_key is not null and project_id=project_key and target_type='project') or (project_key is null and owner_auth_id=owner_key and target_type='investor'));
$$;
revoke all on function private.v76_verification_state(uuid,uuid) from public,anon,authenticated;

create or replace function public.submit_verification_v76(project_key uuid,file_reference text,file_label text,mime_type text,replacement_key uuid default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare previous public.verification_files%rowtype;path text;fid uuid;target text;current_state text;
begin
 if auth.uid() is null or not exists(select 1 from public.users where auth_id=auth.uid() and not coalesce(is_blocked,false)) then raise exception 'Account unavailable';end if;
 if project_key is not null and not exists(select 1 from public.projects where id=project_key and owner_auth_id=auth.uid()) then raise exception 'Project ownership required';end if;
 perform pg_advisory_xact_lock(hashtextextended('verify:'||coalesce(project_key,auth.uid())::text,0));
 target:=case when project_key is null then 'investor' else 'project' end;
 path:=public.v75_object_path(file_reference,'verification-files');
 if path is null or split_part(path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='verification-files' and name=path) then raise exception 'Invalid private document';end if;
 -- Retry of an already submitted object is safe and does not duplicate the request.
 select id into fid from public.verification_files where owner_auth_id=auth.uid() and project_id is not distinct from project_key and file_url=file_reference and is_current limit 1;
 if found then return fid;end if;
 if mime_type is null or mime_type not in ('image/jpeg','image/png','image/webp','application/pdf') then raise exception 'Unsupported document type';end if;
 if length(trim(coalesce(file_label,'')))=0 or length(file_label)>200 then raise exception 'Document name required';end if;
 if replacement_key is not null then
  select * into previous from public.verification_files where id=replacement_key and owner_auth_id=auth.uid() and project_id is not distinct from project_key and target_type=target and is_current for update;
  if not found then raise exception 'Replacement document unavailable';end if;
  update public.verification_files set is_current=false,review_revision=review_revision+1 where id=previous.id;
 end if;
 insert into public.verification_files(owner_auth_id,project_id,target_type,file_url,file_name,file_type,status,is_current,supersedes_file_id)
 values(auth.uid(),project_key,target,file_reference,trim(file_label),mime_type,'pending',true,replacement_key) returning id into fid;
 if project_key is not null then update public.projects set verification_status='pending',review_revision=review_revision+1 where id=project_key;
 else update public.users set verification_status='pending' where auth_id=auth.uid();end if;
 return fid;
end $$;
revoke all on function public.submit_verification_v76(uuid,text,text,text,uuid) from public,anon;
grant execute on function public.submit_verification_v76(uuid,text,text,text,uuid) to authenticated;

create or replace function public.review_document_v76(file_key uuid,expected_revision integer,decision text,reason text default '')
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare d public.verification_files%rowtype;state text;
begin
 if auth.uid() is null or not public.is_admin_staff('verification') then raise exception 'Verification permission required';end if;
 if decision is null or decision not in ('pending','under_review','verified','rejected','needs_documents','suspicious','expired') then raise exception 'Invalid document decision';end if;
 if decision in ('rejected','needs_documents','suspicious','expired') and length(trim(coalesce(reason,'')))<5 then raise exception 'A clear review reason is required';end if;
 select * into d from public.verification_files where id=file_key;
 if not found or d.owner_auth_id is null or d.target_type not in ('project','investor') or (d.target_type='project' and d.project_id is null) then raise exception 'Document target is missing';end if;
 perform pg_advisory_xact_lock(hashtextextended('verify:'||coalesce(d.project_id,d.owner_auth_id)::text,0));
 select * into d from public.verification_files where id=file_key for update;
 if not d.is_current or d.review_revision is distinct from expected_revision then raise exception 'Document changed; reload before reviewing';end if;
 update public.verification_files set status=decision,admin_note=left(reason,2000),reviewed_by=auth.uid(),reviewed_at=now(),review_revision=review_revision+1 where id=d.id;
 state:=private.v76_verification_state(d.project_id,d.owner_auth_id);
 if d.target_type='project' then update public.projects set verification_status=state,review_revision=review_revision+1 where id=d.project_id;
 else update public.users set verification_status=state where auth_id=d.owner_auth_id;end if;
 insert into public.admin_activity_logs(admin_auth_id,action,target_table,target_id,metadata)
 values(auth.uid(),'verification_review','verification_files',d.id::text,jsonb_build_object('previous',d.status,'decision',decision,'reason',reason,'resulting_state',state));
 insert into public.notifications(user_auth_id,title,message,type,link_url,created_by)
 values(d.owner_auth_id,'تحديث التوثيق','حالة المستند: '||decision||case when coalesce(reason,'')<>'' then ' — '||left(reason,500) else '' end,'verification','verification.html'||case when d.project_id is not null then '?project='||d.project_id::text else '' end,auth.uid());
 return state;
end $$;
revoke all on function public.review_document_v76(uuid,integer,text,text) from public,anon;
grant execute on function public.review_document_v76(uuid,integer,text,text) to authenticated;

create or replace function public.review_project_v76(project_key uuid,expected_revision integer,decision text,reason text default '',changes jsonb default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.projects%rowtype;v_price numeric;v_profit numeric;
begin
 if auth.uid() is null or not public.is_admin_staff('projects') then raise exception 'Project review permission required';end if;
 if decision is null or decision not in ('pending','approved','needs_revision','rejected') then raise exception 'Invalid publication decision';end if;
 if decision in ('rejected','needs_revision') and length(trim(coalesce(reason,'')))<5 then raise exception 'A clear review reason is required';end if;
 select * into p from public.projects where id=project_key for update;
 if not found or p.review_revision is distinct from expected_revision then raise exception 'Project changed; reload before reviewing';end if;
 if changes is not null then
  if length(trim(coalesce(changes->>'title','')))<5 or length(coalesce(changes->>'title',''))>160 or length(trim(coalesce(changes->>'description','')))<80 or length(coalesce(changes->>'description',''))>12000 or (length(trim(coalesce(changes->>'location','')))=0 or length(changes->>'location')>160 or coalesce(changes->>'type','') not in ('مشروع للبيع','شراكة','فكرة استثمارية')) or coalesce(changes->>'category','') not in ('restaurants','tech','commerce','services','contracting','realestate') then raise exception 'Invalid project edits';end if;
  v_price:=(changes->>'price')::numeric;v_profit:=nullif(changes->>'monthly_profit','')::numeric;
  if v_price is null or v_price<=0 or v_price='NaN'::numeric or abs(v_price)>1000000000 or (v_profit is not null and (v_profit='NaN'::numeric or abs(v_profit)>1000000000)) then raise exception 'Invalid financial values';end if;
  update public.projects set title=trim(changes->>'title'),description=trim(changes->>'description'),type=changes->>'type',category=changes->>'category',location=trim(changes->>'location'),price=v_price,monthly_profit=v_profit where id=p.id;
 end if;
 update public.projects set status=decision,admin_note=left(reason,2000),review_revision=p.review_revision+1 where id=p.id;
 insert into public.admin_activity_logs(admin_auth_id,action,target_table,target_id,metadata) values(auth.uid(),'project_review','projects',p.id::text,jsonb_build_object('previous',p.status,'decision',decision,'reason',reason));
 insert into public.notifications(user_auth_id,title,message,type,link_url,created_by) values(p.owner_auth_id,'تحديث المشروع','حالة النشر: '||decision||case when coalesce(reason,'')<>'' then ' — '||left(reason,500) else '' end,'project_review','edit-my-project.html?id='||p.id::text,auth.uid());
 return p.id;
end $$;
revoke all on function public.review_project_v76(uuid,integer,text,text,jsonb) from public,anon;
grant execute on function public.review_project_v76(uuid,integer,text,text,jsonb) to authenticated;

-- Revision increments when the owner edits the content, including edits through the v75 API.
create or replace function public.v76_project_revision()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if row(new.title,new.description,new.category,new.type,new.price,new.monthly_profit,new.location) is distinct from row(old.title,old.description,old.category,old.type,old.price,old.monthly_profit,old.location) and new.review_revision=old.review_revision then new.review_revision:=old.review_revision+1;end if;
 return new;
end $$;
revoke all on function public.v76_project_revision() from public,anon,authenticated;
drop trigger if exists v76_project_revision on public.projects;
create trigger v76_project_revision before update on public.projects for each row execute function public.v76_project_revision();

create or replace function public.admin_project_owner_v76(project_key uuid)
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare output jsonb;
begin
 if auth.uid() is null or not public.is_admin_staff('projects') then raise exception 'Project review permission required';end if;
 select jsonb_build_object('name',u.name,'phone',u.phone,'whatsapp',u.whatsapp,'account_type',u.account_type,'plan',u.plan,'verification_status',u.verification_status)
 into output from public.projects p join public.users u on u.auth_id=p.owner_auth_id where p.id=project_key;
 return output;
end $$;
revoke all on function public.admin_project_owner_v76(uuid) from public,anon;
grant execute on function public.admin_project_owner_v76(uuid) to authenticated;

create table if not exists public.project_leads_v76(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),investor_auth_id uuid not null,
 contact_shared boolean not null default false,is_active boolean not null default true,
 owner_stage text not null default 'new' check(owner_stage in ('new','contacted','reviewing','offer','closed','archived')),
 owner_notes text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,investor_auth_id));
alter table public.project_leads_v76 enable row level security;
revoke all on public.project_leads_v76 from public,anon,authenticated;

create or replace function private.v76_paid_owner(uid uuid)
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select exists(select 1 from public.users where auth_id=uid and not coalesce(is_blocked,false) and subscription_status in ('active','paid') and coalesce(plan,'free')<>'free' and (subscription_expires_at is null or subscription_expires_at>now()));
$$;
revoke all on function private.v76_paid_owner(uuid) from public,anon,authenticated;

create or replace function public.set_project_interest_v76(project_key uuid,share_contact boolean default false,active_interest boolean default true)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.projects%rowtype;l public.project_leads_v76%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.users where auth_id=auth.uid() and not coalesce(is_blocked,false)) then raise exception 'Account unavailable';end if;
 if active_interest is null or share_contact is null then raise exception 'Interest preferences required';end if;
 select * into p from public.projects where id=project_key;
 if not found or p.owner_auth_id=auth.uid() then raise exception 'Invalid investment interest';end if;
 -- Existing investors may withdraw or revoke contact sharing even after publication stops.
 select * into l from public.project_leads_v76 where project_id=p.id and investor_auth_id=auth.uid() for update;
 if found and l.contact_shared=(share_contact and active_interest) and l.is_active=active_interest then return l.id;end if;
 if found and p.status not in ('approved','active','published') and (active_interest and (not l.is_active or share_contact)) then raise exception 'Opportunity unavailable';end if;
 if not found and (not active_interest or p.status not in ('approved','active','published')) then raise exception 'Opportunity unavailable';end if;
 insert into public.project_leads_v76(project_id,investor_auth_id,contact_shared,is_active)
 values(p.id,auth.uid(),coalesce(share_contact,false) and active_interest,active_interest)
 on conflict(project_id,investor_auth_id) do update set contact_shared=excluded.contact_shared,is_active=excluded.is_active,updated_at=clock_timestamp()
 returning * into l;
 return l.id;
end $$;
revoke all on function public.set_project_interest_v76(uuid,boolean,boolean) from public,anon;
grant execute on function public.set_project_interest_v76(uuid,boolean,boolean) to authenticated;

create or replace function public.my_interests_v76()
returns table(project_id uuid,title text,contact_shared boolean,is_active boolean)
language plpgsql stable security definer set search_path=pg_catalog,public as $$
begin
 if auth.uid() is null then raise exception 'Sign-in required';end if;
 return query select l.project_id,p.title,l.contact_shared,l.is_active from public.project_leads_v76 l join public.projects p on p.id=l.project_id where l.investor_auth_id=auth.uid() order by l.created_at desc;
end $$;
revoke all on function public.my_interests_v76() from public,anon;
grant execute on function public.my_interests_v76() to authenticated;

create or replace function public.owner_leads_v76()
returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare output jsonb;paid boolean;
begin
 if auth.uid() is null then raise exception 'Sign-in required';end if;
 paid:=private.v76_paid_owner(auth.uid());
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'project_id',p.id,'project_title',p.title,'contact_shared',l.contact_shared,'is_active',l.is_active,'stage',l.owner_stage,'notes',l.owner_notes,'updated_at',l.updated_at,
 'investor_name',case when paid and l.is_active and l.contact_shared then u.name end,'phone',case when paid and l.is_active and l.contact_shared then u.phone end,'whatsapp',case when paid and l.is_active and l.contact_shared then u.whatsapp end) order by l.created_at desc),'[]') into output
 from public.project_leads_v76 l join public.projects p on p.id=l.project_id join public.users u on u.auth_id=l.investor_auth_id where p.owner_auth_id=auth.uid();
 return jsonb_build_object('paid_access',paid,'leads',output);
end $$;
revoke all on function public.owner_leads_v76() from public,anon;
grant execute on function public.owner_leads_v76() to authenticated;

create or replace function public.save_owner_lead_v76(lead_key uuid,expected_time timestamptz,stage text,notes text)
returns timestamptz language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.project_leads_v76%rowtype;stamp timestamptz;
begin
 if auth.uid() is null or not private.v76_paid_owner(auth.uid()) then raise exception 'Active owner subscription required';end if;
 select l0.* into l from public.project_leads_v76 l0 join public.projects p on p.id=l0.project_id where l0.id=lead_key and p.owner_auth_id=auth.uid() for update of l0;
 if not found or l.updated_at is distinct from expected_time then raise exception 'Lead changed; reload before saving';end if;
 if stage not in ('new','contacted','reviewing','offer','closed','archived') or length(coalesce(notes,''))>2000 then raise exception 'Invalid follow-up values';end if;
 stamp:=clock_timestamp();update public.project_leads_v76 set owner_stage=stage,owner_notes=coalesce(notes,''),updated_at=stamp where id=l.id;return stamp;
end $$;
revoke all on function public.save_owner_lead_v76(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.save_owner_lead_v76(uuid,timestamptz,text,text) to authenticated;

create or replace function public.owner_lead_chat_v76(lead_key uuid)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.project_leads_v76%rowtype;pid uuid;
begin
 if auth.uid() is null or not private.v76_paid_owner(auth.uid()) then raise exception 'Active owner subscription required';end if;
 select l0.* into l from public.project_leads_v76 l0 join public.projects p on p.id=l0.project_id where l0.id=lead_key and p.owner_auth_id=auth.uid() and l0.is_active;
 if not found then raise exception 'Lead unavailable';end if;
 insert into public.chat_conversations(project_id,owner_auth_id,investor_auth_id) values(l.project_id,auth.uid(),l.investor_auth_id)
 on conflict(project_id,owner_auth_id,investor_auth_id) do update set project_id=excluded.project_id returning id into pid;
 return pid;
end $$;
revoke all on function public.owner_lead_chat_v76(uuid) from public,anon;
grant execute on function public.owner_lead_chat_v76(uuid) to authenticated;
create or replace function public.v76_protect_review_fields()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') then if tg_op='DELETE' then return old;else return new;end if;end if;
 if tg_table_name='users' then
  if new.verification_status is not distinct from old.verification_status then return new;end if;
 end if;
 raise exception 'Verification decisions require the audited review API';
end $$;
revoke all on function public.v76_protect_review_fields() from public,anon,authenticated;
drop trigger if exists v76_verification_review_guard on public.verification_files;
create trigger v76_verification_review_guard before update on public.verification_files for each row execute function public.v76_protect_review_fields();
drop trigger if exists v76_user_verification_guard on public.users;
create trigger v76_user_verification_guard before update of verification_status on public.users for each row execute function public.v76_protect_review_fields();
create or replace function public.v75_protect_project_fields()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') then return new;end if;
 raise exception 'Project changes require the audited API';
end $$;
create or replace function public.review_tools_ready_v76()
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select auth.uid() is not null and public.transaction_flows_ready_v75()
 and to_regprocedure('public.review_document_v76(uuid,integer,text,text)') is not null
 and to_regclass('public.project_leads_v76') is not null;
$$;
revoke all on function public.review_tools_ready_v76() from public,anon;
grant execute on function public.review_tools_ready_v76() to authenticated;
-- Only the submission/publication APIs may introduce a document; they update its target atomically.
drop trigger if exists v76_verification_submit_guard on public.verification_files;
create trigger v76_verification_submit_guard before insert or delete on public.verification_files for each row execute function public.v76_protect_review_fields();
-- Repair badges granted by historical single-file decisions.
update public.projects p set verification_status=private.v76_verification_state(p.id,p.owner_auth_id);
update public.users u set verification_status=private.v76_verification_state(null,u.auth_id)
where exists(select 1 from public.verification_files d where d.owner_auth_id=u.auth_id and d.target_type='investor');
commit;
