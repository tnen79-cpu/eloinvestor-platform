-- Next.js application schema (verification_requests, users and projects), not the static ZIP schema.
begin;
create schema if not exists private;
create or replace function public.next_admin_permission(permission text default null)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select exists(select 1 from public.users u where u.auth_id::text=auth.uid()::text
 and coalesce(to_jsonb(u)->>'admin_status','active') not in ('suspended','revoked')
 and not coalesce((to_jsonb(u)->>'is_blocked')::boolean,false)
 and auth.uid() is not null
 and (coalesce(nullif(to_jsonb(u)->>'admin_role',''),u.role)='super_admin'
 or (coalesce(nullif(to_jsonb(u)->>'admin_role',''),u.role) in ('admin','verification_admin','support_admin','content_admin','finance_admin')
 and (permission is null or coalesce((to_jsonb(u)->'admin_permissions'->>permission)::boolean,false)
 or (coalesce(nullif(to_jsonb(u)->>'admin_role',''),u.role)='verification_admin' and permission='verifications')))));
$$;
revoke all on function public.next_admin_permission(text) from public,anon;
grant execute on function public.next_admin_permission(text) to authenticated,anon;
create or replace function private.next_owner(p public.projects) returns text language sql immutable set search_path=pg_catalog as $$
 select coalesce(nullif(to_jsonb(p)->>'owner_auth_id',''),nullif(to_jsonb(p)->>'user_auth_id',''),nullif(to_jsonb(p)->>'user_id',''),nullif(to_jsonb(p)->>'owner_id',''),nullif(to_jsonb(p)->>'created_by',''));
$$;
revoke all on function private.next_owner(public.projects) from public,anon,authenticated;
alter table public.verification_requests add column if not exists review_revision integer not null default 0,
 add column if not exists is_current boolean not null default true,add column if not exists supersedes_id uuid,
 add column if not exists submission_key uuid;
create unique index if not exists next_verification_submission_unique on public.verification_requests(user_auth_id,submission_key) where submission_key is not null;
create or replace function private.next_verification_state(project_key text,owner_key text)
returns text language sql stable security invoker set search_path=pg_catalog,public as $$
 select case when count(*)=0 then 'none' when bool_and(status='approved') then 'approved'
 when bool_or(status in ('rejected','revision','needs_revision')) then 'revision' else 'pending' end
 from public.verification_requests where is_current and ((project_key is not null and project_id::text=project_key and request_type='project') or (project_key is null and user_auth_id::text=owner_key and request_type='investor'));
$$;
revoke all on function private.next_verification_state(text,text) from public,anon,authenticated;
create or replace function public.next_submit_verification(request_key uuid,request_kind text,project_key uuid,document_path text,document_mime text,note_text text default '',country text default 'om',replacement_key uuid default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.projects%rowtype;old public.verification_requests%rowtype;r public.verification_requests%rowtype;fid uuid;reference text;
begin
 if auth.uid() is null or not exists(select 1 from public.users u where u.auth_id::text=auth.uid()::text and not coalesce((to_jsonb(u)->>'is_blocked')::boolean,false)) then raise exception 'Account unavailable';end if;
 if request_key is null or request_kind is null or request_kind not in ('project','investor') or length(coalesce(note_text,''))>2000 or country !~ '^[a-z]{2}$' then raise exception 'Invalid verification request';end if;
 if request_kind='project' then select * into p from public.projects where id=project_key; if not found or private.next_owner(p) is distinct from auth.uid()::text then raise exception 'Project ownership required';end if;
 elsif project_key is not null then raise exception 'Invalid verification target';end if;
 if split_part(document_path,'/',1)<>auth.uid()::text or document_path like '%..%' or document_mime is null or document_mime not in ('application/pdf','image/jpeg','image/png','image/webp') or not exists(select 1 from storage.objects where bucket_id='verification-files' and name=document_path) then raise exception 'Invalid private document';end if;
 reference:='storage://verification-files/'||document_path;
 perform pg_advisory_xact_lock(hashtextextended('next-verify:'||coalesce(project_key::text,auth.uid()::text),0));
 select * into r from public.verification_requests where user_auth_id::text=auth.uid()::text and submission_key=request_key;
 if found then
  if r.document_url<>reference or r.project_id::text is distinct from project_key::text or r.request_type<>request_kind or r.supersedes_id is distinct from replacement_key or coalesce(r.note,'')<>coalesce(note_text,'') then raise exception 'Request key reused with different content';end if;return r.id;
 end if;
 if replacement_key is not null then
  select * into old from public.verification_requests where id=replacement_key and user_auth_id::text=auth.uid()::text and project_id::text is not distinct from project_key::text and request_type=request_kind and is_current for update;
  if not found then raise exception 'Replacement unavailable';end if;
  update public.verification_requests set is_current=false,review_revision=review_revision+1 where id=old.id;
 end if;
 fid:=gen_random_uuid();
 -- Populate against the existing row type: historical schemas use either uuid or text identity columns.
 r:=jsonb_populate_record(null::public.verification_requests,jsonb_build_object('id',fid,'user_auth_id',auth.uid(),'request_type',request_kind,'type',request_kind,'project_id',project_key,'project_title',p.title,'status','pending','document_url',reference,'file_url',reference,'document_type',document_mime,'note',note_text,'notes',note_text,'country_code',country,'created_at',now(),'updated_at',now(),'review_revision',0,'is_current',true,'supersedes_id',replacement_key,'submission_key',request_key));
 insert into public.verification_requests select r.*;
 if request_kind='project' then update public.projects set is_verified=false,verified=false,verification_status='pending' where id=project_key;
 else update public.users set is_verified=false,is_verified_investor=false,verification_status='pending' where auth_id::text=auth.uid()::text;end if;
 return fid;
end $$;
revoke all on function public.next_submit_verification(uuid,text,uuid,text,text,text,text,uuid) from public,anon;
grant execute on function public.next_submit_verification(uuid,text,uuid,text,text,text,text,uuid) to authenticated;
create or replace function public.next_review_verification(request_id uuid,expected_revision integer,decision text,reason text default '')
returns text language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.verification_requests%rowtype;state text;n public.notifications%rowtype;
begin
 if auth.uid() is null or not public.next_admin_permission('verifications') then raise exception 'Verification permission required';end if;
 if decision is null or decision not in ('approved','rejected','revision','pending') or length(coalesce(reason,''))>2000 or (decision in ('rejected','revision') and length(trim(coalesce(reason,'')))<5) then raise exception 'A valid decision and clear reason are required';end if;
 select * into r from public.verification_requests where id=request_id;
 if not found or r.user_auth_id is null or r.request_type is null or r.request_type not in ('project','investor') or (r.request_type='project' and r.project_id is null) then raise exception 'Verification target unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended('next-verify:'||coalesce(r.project_id::text,r.user_auth_id::text),0));
 select * into r from public.verification_requests where id=request_id for update;
 if not r.is_current or r.review_revision is distinct from expected_revision then raise exception 'Request changed; reload before reviewing';end if;
 if r.request_type='project' and not exists(select 1 from public.projects p where p.id::text=r.project_id::text and private.next_owner(p)=r.user_auth_id::text) then raise exception 'Project verification target changed';end if;
 if r.request_type='investor' and not exists(select 1 from public.users u where u.auth_id::text=r.user_auth_id::text) then raise exception 'Investor verification target unavailable';end if;
 update public.verification_requests set status=decision,admin_note=reason,reviewed_by=auth.uid(),reviewed_at=now(),updated_at=now(),review_revision=review_revision+1 where id=r.id;
 state:=private.next_verification_state(r.project_id::text,r.user_auth_id::text);
 if r.request_type='project' then update public.projects set is_verified=(state='approved'),verified=(state='approved'),verification_status=state where id::text=r.project_id::text;
 else update public.users set is_verified=(state='approved'),is_verified_investor=(state='approved'),verification_status=state where auth_id::text=r.user_auth_id::text;end if;
 insert into public.admin_action_logs(admin_auth_id,action,target_type,target_id,details) values(auth.uid(),'review_verification','verification_request',r.id::text,jsonb_build_object('previous',r.status,'decision',decision,'reason',reason,'resulting_state',state));
 n:=jsonb_populate_record(null::public.notifications,jsonb_build_object('user_auth_id',r.user_auth_id,'title','تحديث التوثيق','body',decision||case when reason<>'' then ' — '||reason else '' end,'type','verification'));
 insert into public.notifications(user_auth_id,title,body,type) values(n.user_auth_id,n.title,n.body,n.type);
 return state;
end $$;
revoke all on function public.next_review_verification(uuid,integer,text,text) from public,anon;
grant execute on function public.next_review_verification(uuid,integer,text,text) to authenticated;
-- Contain legacy permissive policies, without depending on their names.
alter table public.verification_requests enable row level security;
create policy next_verification_read_guard on public.verification_requests as restrictive for select to public using(auth.uid() is not null and (user_auth_id::text=auth.uid()::text or public.next_admin_permission('verifications')));
create policy next_verification_read_allow on public.verification_requests for select to authenticated using(user_auth_id::text=auth.uid()::text or public.next_admin_permission('verifications'));
create or replace function public.next_verification_write_guard() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') then if tg_op='DELETE' then return old;else return new;end if;end if;
 raise exception 'Use the verification submission and review API';
end $$;
revoke all on function public.next_verification_write_guard() from public,anon,authenticated;
create trigger next_verification_write_guard before insert or update or delete on public.verification_requests for each row execute function public.next_verification_write_guard();
update storage.buckets set public=false,file_size_limit=8388608,allowed_mime_types=array['application/pdf','image/jpeg','image/png','image/webp'] where id in ('verification-files','verification-docs');
create policy next_verification_storage_read on storage.objects as restrictive for select to public using(bucket_id not in ('verification-files','verification-docs') or (auth.uid() is not null and (split_part(name,'/',1)=auth.uid()::text or public.next_admin_permission('verifications'))));
create policy next_verification_storage_write on storage.objects as restrictive for all to public using(bucket_id not in ('verification-files','verification-docs') or (auth.uid() is not null and split_part(name,'/',1)=auth.uid()::text)) with check(bucket_id not in ('verification-files','verification-docs') or (auth.uid() is not null and split_part(name,'/',1)=auth.uid()::text));
-- FOR ALL would otherwise prevent reviewers from reading non-owned objects. Keep write guards operation-specific.
drop policy next_verification_storage_write on storage.objects;
create policy next_verification_storage_insert on storage.objects as restrictive for insert to public with check(bucket_id not in ('verification-files','verification-docs') or (auth.uid() is not null and split_part(name,'/',1)=auth.uid()::text));
create policy next_verification_storage_update on storage.objects as restrictive for update to public using(bucket_id not in ('verification-files','verification-docs')) with check(bucket_id not in ('verification-files','verification-docs'));
create policy next_verification_storage_delete on storage.objects as restrictive for delete to public using(bucket_id not in ('verification-files','verification-docs'));
create policy next_verification_storage_read_allow on storage.objects for select to authenticated using(bucket_id in ('verification-files','verification-docs') and (split_part(name,'/',1)=auth.uid()::text or public.next_admin_permission('verifications')));
create policy next_verification_storage_insert_allow on storage.objects for insert to authenticated with check(bucket_id in ('verification-files','verification-docs') and split_part(name,'/',1)=auth.uid()::text);
create policy next_saved_scope on public.investor_saved_projects as restrictive for all to public using(auth.uid() is not null and investor_auth_id::text=auth.uid()::text) with check(auth.uid() is not null and investor_auth_id::text=auth.uid()::text);
alter table public.investor_saved_projects enable row level security;
create policy next_saved_allow on public.investor_saved_projects for all to authenticated using(investor_auth_id::text=auth.uid()::text) with check(investor_auth_id::text=auth.uid()::text);
create or replace function public.next_marketplace_ready() returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and exists(select 1 from storage.buckets where id='verification-files' and not public) and to_regprocedure('public.next_review_verification(uuid,integer,text,text)') is not null;
$$;
revoke all on function public.next_marketplace_ready() from public,anon;
grant execute on function public.next_marketplace_ready() to authenticated;
-- Protect authoritative roles and verification from legacy browser writes.
create or replace function public.next_user_fields_guard() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare field text;j jsonb:=to_jsonb(new);prior jsonb;
begin
 if current_user in ('postgres','supabase_admin','service_role') then return new;end if;
 if tg_op='INSERT' then
  if coalesce(j->>'role','user') not in ('user','investor','owner','both') or coalesce(j->>'admin_role','') not in ('','user') or coalesce((j->>'is_admin')::boolean,false) or coalesce((j->>'is_verified')::boolean,false) or coalesce((j->>'is_verified_investor')::boolean,false) or coalesce(j->'admin_permissions','{}') not in ('{}'::jsonb,'null'::jsonb) then raise exception 'Privileged profile fields are server-managed';end if;
 else
  prior:=to_jsonb(old);
  foreach field in array array['auth_id','role','admin_role','is_admin','admin_status','admin_permissions','is_blocked','is_verified','is_verified_investor','verification_status','plan','subscription_status','subscription_expires_at','remaining_projects','featured_projects'] loop
   if j->field is distinct from prior->field then raise exception 'Privileged profile fields are server-managed';end if;
  end loop;
 end if;
 return new;
end $$;
revoke all on function public.next_user_fields_guard() from public,anon,authenticated;
create trigger next_user_fields_guard before insert or update on public.users for each row execute function public.next_user_fields_guard();
create or replace function public.next_project_verification_guard() returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') then return new;end if;
 if tg_op='INSERT' then
  if auth.uid() is null or coalesce(nullif(to_jsonb(new)->>'owner_auth_id',''),nullif(to_jsonb(new)->>'user_auth_id',''),nullif(to_jsonb(new)->>'user_id',''),nullif(to_jsonb(new)->>'owner_id',''),nullif(to_jsonb(new)->>'created_by','')) is distinct from auth.uid()::text then raise exception 'Project ownership required';end if;
  if coalesce(new.is_verified,false) or coalesce(new.verified,false) or new.verification_status='approved' then raise exception 'Verification requires document review';end if;
  if not public.next_admin_permission('projects') then new:=jsonb_populate_record(new,jsonb_build_object('status','pending','moderation_status','pending','publish_status','pending','approval_status','pending','is_active',false));end if;
 else
  if auth.uid() is null or (coalesce(nullif(to_jsonb(old)->>'owner_auth_id',''),nullif(to_jsonb(old)->>'user_auth_id',''),nullif(to_jsonb(old)->>'user_id',''),nullif(to_jsonb(old)->>'owner_id',''),nullif(to_jsonb(old)->>'created_by','')) is distinct from auth.uid()::text and not public.next_admin_permission('projects')) then raise exception 'Project ownership or review permission required';end if;
  if (new.status is distinct from old.status or new.is_active is distinct from old.is_active or (to_jsonb(new)->'moderation_status') is distinct from (to_jsonb(old)->'moderation_status') or (to_jsonb(new)->'publish_status') is distinct from (to_jsonb(old)->'publish_status')) and not public.next_admin_permission('projects') then raise exception 'Publication decisions are server-managed';end if;
  if row(new.is_verified,new.verified,new.verification_status) is distinct from row(old.is_verified,old.verified,old.verification_status) then raise exception 'Verification requires document review';end if;
  if (to_jsonb(new)->'owner_auth_id') is distinct from (to_jsonb(old)->'owner_auth_id') or (to_jsonb(new)->'user_auth_id') is distinct from (to_jsonb(old)->'user_auth_id') or (to_jsonb(new)->'user_id') is distinct from (to_jsonb(old)->'user_id') or (to_jsonb(new)->'owner_id') is distinct from (to_jsonb(old)->'owner_id') or (to_jsonb(new)->'created_by') is distinct from (to_jsonb(old)->'created_by') then raise exception 'Project ownership is immutable';end if;
 end if;
 return new;
end $$;
revoke all on function public.next_project_verification_guard() from public,anon,authenticated;
create trigger next_project_verification_guard before insert or update on public.projects for each row execute function public.next_project_verification_guard();
create table public.next_project_leads(
 id uuid primary key default gen_random_uuid(),project_id uuid not null references public.projects(id),investor_auth_id uuid not null,
 contact_shared boolean not null default false,is_active boolean not null default true,stage text not null default 'new' check(stage in ('new','contacted','reviewing','offer','closed','archived')),
 notes text not null default '',created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(project_id,investor_auth_id));
alter table public.next_project_leads enable row level security;
revoke all on public.next_project_leads from public,anon,authenticated;
create or replace function public.next_record_interest(project_key uuid,share_contact boolean default false,active_interest boolean default true)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.projects%rowtype;l public.next_project_leads%rowtype;
begin
 if auth.uid() is null or share_contact is null or active_interest is null or not exists(select 1 from public.users u where u.auth_id::text=auth.uid()::text and not coalesce((to_jsonb(u)->>'is_blocked')::boolean,false)) then raise exception 'Account unavailable';end if;
 select * into p from public.projects where id=project_key;
 if not found or private.next_owner(p) is null or private.next_owner(p)=auth.uid()::text then raise exception 'Invalid investment interest';end if;
 select * into l from public.next_project_leads where project_id=project_key and investor_auth_id=auth.uid() for update;
 if (coalesce(p.status,'') not in ('approved','active','published') or coalesce((to_jsonb(p)->>'is_active')::boolean,true)=false) and (not found or (active_interest and (not l.is_active or share_contact))) then raise exception 'Opportunity unavailable';end if;
 insert into public.next_project_leads(project_id,investor_auth_id,contact_shared,is_active) values(project_key,auth.uid(),share_contact and active_interest,active_interest)
 on conflict(project_id,investor_auth_id) do update set contact_shared=excluded.contact_shared,is_active=excluded.is_active,updated_at=clock_timestamp() returning * into l;
 return l.id;
end $$;
revoke all on function public.next_record_interest(uuid,boolean,boolean) from public,anon;
grant execute on function public.next_record_interest(uuid,boolean,boolean) to authenticated;
alter table public.investor_contacted_projects add column if not exists conversation_id uuid,add column if not exists project_snapshot jsonb default '{}';
create unique index if not exists next_contacted_pair_unique on public.investor_contacted_projects(investor_auth_id,project_id);
create or replace function public.next_open_contact(project_key uuid,share_contact boolean default false)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.projects%rowtype;cid uuid;owner_key uuid;contact public.investor_contacted_projects%rowtype;
begin
 perform public.next_record_interest(project_key,share_contact,true);
 select * into p from public.projects where id=project_key;
 owner_key:=private.next_owner(p)::uuid;
 if coalesce(p.status,'') not in ('approved','active','published') or coalesce((to_jsonb(p)->>'is_active')::boolean,true)=false or owner_key is null then raise exception 'Opportunity unavailable';end if;
 perform pg_advisory_xact_lock(hashtextextended('next-contact:'||project_key::text||auth.uid()::text,0));
 if exists(select 1 from public.conversations where project_id=project_key and buyer_id=auth.uid() and owner_id is distinct from owner_key) then raise exception 'Conversation participants do not match the project owner';end if;
 select id into cid from public.conversations where project_id=project_key and buyer_id=auth.uid();
 if not found then
  insert into public.conversations(project_id,buyer_id,owner_id,country_code,status) values(project_key,auth.uid(),owner_key,p.country_code,'open') returning id into cid;
  update public.projects set contacts_count=coalesce(contacts_count,0)+1 where id=project_key;
 end if;
 contact:=jsonb_populate_record(null::public.investor_contacted_projects,jsonb_build_object('investor_auth_id',auth.uid(),'project_id',p.id,'conversation_id',cid));
 insert into public.investor_contacted_projects(investor_auth_id,project_id,conversation_id,project_snapshot) values(contact.investor_auth_id,contact.project_id,cid,jsonb_build_object('id',p.id,'title',p.title,'title_ar',to_jsonb(p)->>'title_ar','title_en',to_jsonb(p)->>'title_en','city',to_jsonb(p)->>'city','price',to_jsonb(p)->'price','cover_image_url',to_jsonb(p)->>'cover_image_url')) on conflict(investor_auth_id,project_id) do update set conversation_id=excluded.conversation_id;
 return cid;
end $$;
revoke all on function public.next_open_contact(uuid,boolean) from public,anon;
grant execute on function public.next_open_contact(uuid,boolean) to authenticated;
create or replace function public.next_my_interests() returns jsonb language sql stable security definer set search_path=pg_catalog,public as $$
 select coalesce(jsonb_agg(jsonb_build_object('project_id',p.id,'title',p.title,'country',p.country_code,'contact_shared',l.contact_shared,'is_active',l.is_active) order by l.created_at desc),'[]') from public.next_project_leads l join public.projects p on p.id=l.project_id where auth.uid() is not null and l.investor_auth_id=auth.uid();
$$;
revoke all on function public.next_my_interests() from public,anon;
grant execute on function public.next_my_interests() to authenticated;
create or replace function private.next_paid_owner() returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select exists(select 1 from public.users u where u.auth_id::text=auth.uid()::text and not coalesce((to_jsonb(u)->>'is_blocked')::boolean,false)
 and coalesce(to_jsonb(u)->>'subscription_status','free') in ('active','paid','pro','elite','business','growth','owner_growth','owner_business') and coalesce(to_jsonb(u)->>'plan','free') not in ('','free','starter')
 and (nullif(to_jsonb(u)->>'subscription_expires_at','') is null or (to_jsonb(u)->>'subscription_expires_at')::timestamptz>now()));
$$;
revoke all on function private.next_paid_owner() from public,anon,authenticated;
create or replace function public.next_owner_leads() returns jsonb language plpgsql stable security definer set search_path=pg_catalog,public as $$
declare paid boolean;rows jsonb;
begin
 if auth.uid() is null then raise exception 'Sign-in required';end if;paid:=private.next_paid_owner();
 select coalesce(jsonb_agg(jsonb_build_object('id',l.id,'project_id',p.id,'title',p.title,'is_active',l.is_active,'contact_shared',l.contact_shared,'stage',l.stage,'notes',l.notes,'updated_at',l.updated_at,
 'investor_name',case when paid and l.is_active and l.contact_shared then coalesce(to_jsonb(u)->>'name',to_jsonb(u)->>'full_name') end,'phone',case when paid and l.is_active and l.contact_shared then to_jsonb(u)->>'phone' end,'whatsapp',case when paid and l.is_active and l.contact_shared then to_jsonb(u)->>'whatsapp' end) order by l.created_at desc),'[]') into rows from public.next_project_leads l join public.projects p on p.id=l.project_id join public.users u on u.auth_id::text=l.investor_auth_id::text where private.next_owner(p)=auth.uid()::text;
 return jsonb_build_object('paid_access',paid,'leads',rows);
end $$;
revoke all on function public.next_owner_leads() from public,anon;
grant execute on function public.next_owner_leads() to authenticated;
create or replace function public.next_save_lead(lead_key uuid,expected_time timestamptz,new_stage text,new_notes text)
returns timestamptz language plpgsql security definer set search_path=pg_catalog,public as $$
declare l public.next_project_leads%rowtype;stamp timestamptz;
begin
 if auth.uid() is null or not private.next_paid_owner() then raise exception 'Active subscription required';end if;
 select l0.* into l from public.next_project_leads l0 join public.projects p on p.id=l0.project_id where l0.id=lead_key and private.next_owner(p)=auth.uid()::text for update of l0;
 if not found or l.updated_at is distinct from expected_time then raise exception 'Lead changed; reload before saving';end if;
 if new_stage is null or new_stage not in ('new','contacted','reviewing','offer','closed','archived') or length(coalesce(new_notes,''))>2000 then raise exception 'Invalid follow-up';end if;
 stamp:=clock_timestamp();update public.next_project_leads set stage=new_stage,notes=coalesce(new_notes,''),updated_at=stamp where id=l.id;return stamp;
end $$;
revoke all on function public.next_save_lead(uuid,timestamptz,text,text) from public,anon;
grant execute on function public.next_save_lead(uuid,timestamptz,text,text) to authenticated;

create or replace function public.next_admin_update_user(target_key text,changes jsonb) returns boolean language plpgsql security definer set search_path=pg_catalog,public as $$
declare u public.users%rowtype;field text;update_json jsonb:='{}';is_super boolean;
begin
 if auth.uid() is null or jsonb_typeof(changes) is distinct from 'object' then raise exception 'Administrative profile update required';end if;
 select coalesce(nullif(to_jsonb(x)->>'admin_role',''),x.role)='super_admin' into is_super from public.users x where x.auth_id::text=auth.uid()::text;
 if not public.next_admin_permission('users') then
  if not public.next_admin_permission('packages') or exists(select 1 from jsonb_object_keys(changes) k where k not in ('plan','subscription_status','subscription_expires_at','remaining_projects','featured_projects','package_type')) then raise exception 'Profile management permission required';end if;
 end if;
 select * into u from public.users where auth_id::text=target_key for update;
 if not found then raise exception 'Profile unavailable';end if;
 for field in select jsonb_object_keys(changes) loop
  if field not in ('name','full_name','phone','whatsapp','email','account_type','role','admin_role','admin_permissions','admin_status','is_admin','created_by_admin','is_blocked','status','plan','subscription_status','subscription_expires_at','remaining_projects','featured_projects','package_type') then raise exception 'Unsupported profile field';end if;
  if field in ('role','admin_role','admin_permissions','admin_status','is_admin','created_by_admin') and not coalesce(is_super,false) then raise exception 'Super admin required for staff permissions';end if;
  if to_jsonb(u) ? field then update_json:=update_json||jsonb_build_object(field,changes->field);end if;
 end loop;
 for field in select jsonb_object_keys(update_json) loop
  execute format('update public.users set %1$I=(jsonb_populate_record(null::public.users,$1)).%1$I where auth_id::text=$2',field) using update_json,target_key;
 end loop;
 insert into public.admin_action_logs(admin_auth_id,action,target_type,target_id,details) values(auth.uid(),'update_user','user',target_key,jsonb_build_object('fields',array(select jsonb_object_keys(update_json))));
 return true;
end $$;
revoke all on function public.next_admin_update_user(text,jsonb) from public,anon;
grant execute on function public.next_admin_update_user(text,jsonb) to authenticated;
-- Old broad role-management RPCs must not bypass the new permission checks.
do $$begin
 if to_regprocedure('public.admin_update_user(text,text,jsonb)') is not null then revoke execute on function public.admin_update_user(text,text,jsonb) from public,anon,authenticated;end if;
 if to_regprocedure('public.admin_update_user(uuid,text,jsonb)') is not null then revoke execute on function public.admin_update_user(uuid,text,jsonb) from public,anon,authenticated;end if;
end $$;


-- Saved-search filters are private even if a historical permissive policy exists.
alter table public.saved_searches enable row level security;
create policy next_search_scope on public.saved_searches as restrictive for all to public using(auth.uid() is not null and user_auth_id::text=auth.uid()::text) with check(auth.uid() is not null and user_auth_id::text=auth.uid()::text);
create policy next_search_allow on public.saved_searches for all to authenticated using(user_auth_id::text=auth.uid()::text) with check(user_auth_id::text=auth.uid()::text);

alter table public.investor_contacted_projects enable row level security;
create policy next_contacted_scope on public.investor_contacted_projects as restrictive for all to public using(auth.uid() is not null and investor_auth_id::text=auth.uid()::text) with check(auth.uid() is not null and investor_auth_id::text=auth.uid()::text);
commit;
