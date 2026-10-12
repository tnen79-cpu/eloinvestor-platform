-- v75: transactional project publication and authoritative payment requests.
-- Apply after v74, with the existing v38 tables present.
begin;
alter table public.projects add column if not exists client_request_id uuid,add column if not exists submission_fingerprint text;
create unique index if not exists v75_project_request_unique on public.projects(owner_auth_id,client_request_id) where client_request_id is not null;
alter table public.payment_requests add column if not exists client_request_id uuid,add column if not exists plan_snapshot jsonb;
create unique index if not exists v75_payment_request_unique on public.payment_requests(user_auth_id,client_request_id) where client_request_id is not null;
alter table public.admin_plans add column if not exists featured_limit integer not null default 0,add column if not exists payment_instructions text;
drop policy if exists "v75_public_active_plans" on public.admin_plans;
create policy "v75_public_active_plans" on public.admin_plans for select to anon,authenticated using(is_active=true);
grant select on public.admin_plans to anon,authenticated;

create or replace function public.v75_object_path(value text,bucket text)
returns text language sql immutable security invoker set search_path=pg_catalog as $$
 select case
 when starts_with(value,'storage://'||bucket||'/') then substr(value,length('storage://'||bucket||'/')+1)
 when starts_with(value,'https://khzlqesyhkmucewiwmkg.supabase.co/storage/v1/object/public/'||bucket||'/') then substr(value,length('https://khzlqesyhkmucewiwmkg.supabase.co/storage/v1/object/public/'||bucket||'/')+1)
 else null end;
$$;
revoke all on function public.v75_object_path(text,text) from public,anon;
grant execute on function public.v75_object_path(text,text) to authenticated;

create or replace function public.publish_project_v75(request_key uuid,details jsonb,images jsonb default '[]',documents jsonb default '[]')
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare u public.users%rowtype;p public.projects%rowtype;item jsonb;path text;pid uuid;price numeric;profit numeric;idx integer:=0;
begin
 if auth.uid() is null or request_key is null then raise exception 'Authentication and request key required';end if;
 select * into u from public.users where auth_id=auth.uid() for update;
 if not found or u.is_blocked or u.account_type not in ('owner','both','project_owner') then raise exception 'Publishing is unavailable for this account';end if;
 select * into p from public.projects where owner_auth_id=auth.uid() and client_request_id=request_key;
 if found then
  if p.submission_fingerprint is distinct from md5(jsonb_build_object('details',details,'images',images,'documents',documents)::text) then raise exception 'Request key reused for a different project';end if;
  return p.id;end if;
 if coalesce(u.remaining_projects,0)<=0 then raise exception 'No available project credit';end if;
 if jsonb_typeof(details) is distinct from 'object' or length(trim(coalesce(details->>'title','')))<5 or length(trim(coalesce(details->>'description','')))<80
 or length(coalesce(details->>'title',''))>160 or length(coalesce(details->>'description',''))>12000
 or length(trim(coalesce(details->>'location','')))=0 or length(coalesce(details->>'location',''))>200
 or coalesce(details->>'category','') not in ('restaurants','tech','commerce','services','contracting','realestate')
 or coalesce(details->>'type','') not in ('مشروع للبيع','شراكة','فكرة استثمارية') then raise exception 'Invalid project fields';end if;
 price:=(details->>'price')::numeric;profit:=nullif(details->>'monthly_profit','')::numeric;
 if price is null or price<=0 or price='NaN'::numeric or abs(price)>1000000000 or (profit is not null and (profit='NaN'::numeric or abs(profit)>1000000000)) then raise exception 'Invalid financial values';end if;
 if jsonb_typeof(images) is distinct from 'array' or jsonb_array_length(images)>10 or jsonb_typeof(documents) is distinct from 'array' or jsonb_array_length(documents)>10 then raise exception 'Invalid file count';end if;
 for item in select value from jsonb_array_elements(images) loop
  path:=public.v75_object_path(item#>>'{}','project-images');
  if path is null or split_part(path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='project-images' and name=path) then raise exception 'Invalid project image';end if;
 end loop;
 for item in select value from jsonb_array_elements(documents) loop
  path:=public.v75_object_path(item->>'file_url','verification-files');
  if path is null or split_part(path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='verification-files' and name=path) then raise exception 'Invalid verification file';end if;
 end loop;
 insert into public.projects(owner_auth_id,user_id,title,description,category,type,price,monthly_profit,location,whatsapp,image_url,status,verification_status,views_count,contacts_count,client_request_id,submission_fingerprint)
 values(auth.uid(),u.id,trim(details->>'title'),trim(details->>'description'),details->>'category',details->>'type',price,profit,trim(details->>'location'),u.whatsapp,images->>0,'pending',case when jsonb_array_length(documents)>0 then 'pending' else 'not_verified' end,0,0,request_key,md5(jsonb_build_object('details',details,'images',images,'documents',documents)::text)) returning id into pid;
 for item in select value from jsonb_array_elements(images) loop
  insert into public.project_images(project_id,image_url,sort_order) values(pid,item#>>'{}',idx);idx:=idx+1;
 end loop;
 for item in select value from jsonb_array_elements(documents) loop
  insert into public.verification_files(owner_auth_id,project_id,target_type,file_url,file_name,file_type,status)
  values(auth.uid(),pid,'project',item->>'file_url',left(item->>'file_name',200),item->>'file_type','pending');
 end loop;
 update public.users set remaining_projects=remaining_projects-1,free_project_used=true where auth_id=auth.uid();
 return pid;
end $$;
revoke all on function public.publish_project_v75(uuid,jsonb,jsonb,jsonb) from public,anon;
grant execute on function public.publish_project_v75(uuid,jsonb,jsonb,jsonb) to authenticated;

create or replace function public.request_payment_v75(request_key uuid,plan_code text,reference_text text,receipt text,note_text text default '',quoted_terms jsonb default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.admin_plans%rowtype;r public.payment_requests%rowtype;pid uuid;path text;u public.users%rowtype;
begin
 if auth.uid() is null or request_key is null then raise exception 'Authentication and request key required';end if;
 select * into u from public.users where auth_id=auth.uid() for update;
 if not found or u.is_blocked then raise exception 'Account unavailable';end if;
 select * into r from public.payment_requests where user_auth_id=auth.uid() and client_request_id=request_key;
 if found then
  if r.plan is distinct from plan_code or r.payment_reference is distinct from trim(reference_text) or r.receipt_url is distinct from receipt or coalesce(r.note,'') is distinct from coalesce(note_text,'') then raise exception 'Request key reused for different payment';end if;
  return r.id;
 end if;
 select * into p from public.admin_plans where code=plan_code and is_active=true;
 if not found or p.price<=0 or p.price='NaN'::numeric or p.duration_days<1 or p.project_limit<0 or p.featured_limit<0 or length(trim(coalesce(p.payment_instructions,'')))=0 then raise exception 'Payment instructions or package configuration unavailable';end if;
 if quoted_terms is distinct from jsonb_build_object('price',p.price,'credits',p.project_limit,'featured',p.featured_limit,'days',p.duration_days,'instructions',p.payment_instructions) then raise exception 'Package price or payment instructions changed; reload before paying';end if;
 if length(trim(coalesce(reference_text,'')))<3 or length(reference_text)>200 or length(coalesce(note_text,''))>2000 then raise exception 'Invalid transfer reference or note';end if;
 path:=public.v75_object_path(receipt,'payment-receipts');
 if path is null or split_part(path,'/',1)<>auth.uid()::text or not exists(select 1 from storage.objects where bucket_id='payment-receipts' and name=path) then raise exception 'Receipt does not belong to this account';end if;
 insert into public.payment_requests(user_auth_id,plan,amount_omr,credits,featured_projects,days,payment_method,payment_reference,receipt_url,note,status,client_request_id,plan_snapshot)
 values(auth.uid(),p.code,p.price,p.project_limit,p.featured_limit,p.duration_days,'bank_transfer',trim(reference_text),receipt,coalesce(note_text,''),'pending',request_key,jsonb_build_object('code',p.code,'name',p.name,'price',p.price,'credits',p.project_limit,'featured',p.featured_limit,'days',p.duration_days,'instructions',p.payment_instructions)) returning id into pid;
 return pid;
end $$;
revoke all on function public.request_payment_v75(uuid,text,text,text,text,jsonb) from public,anon;
grant execute on function public.request_payment_v75(uuid,text,text,text,text,jsonb) to authenticated;

-- No client may bypass the transactional APIs by assigning payment terms or publishing rows directly.
drop policy if exists "v75_project_insert_gate" on public.projects;
create policy "v75_project_insert_gate" on public.projects as restrictive for insert to public with check(false);
revoke insert,update,delete on public.payment_requests from anon,authenticated;
grant select on public.payment_requests to authenticated;
alter table public.payment_requests enable row level security;
drop policy if exists "v75_payment_private_guard" on public.payment_requests;
create policy "v75_payment_private_guard" on public.payment_requests as restrictive for select to public using(auth.uid() is not null and (user_auth_id=auth.uid() or public.is_admin_staff('payments') or public.is_admin_staff('plans')));
drop policy if exists "v75_payment_read" on public.payment_requests;
create policy "v75_payment_read" on public.payment_requests for select to authenticated using(user_auth_id=auth.uid() or public.is_admin_staff('payments') or public.is_admin_staff('plans'));

create or replace function public.approve_payment_request(request_id uuid,admin_note_text text default null)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.payment_requests%rowtype;affected integer;
begin
 if auth.uid() is null or not(public.is_admin_staff('payments') or public.is_admin_staff('plans')) then raise exception 'Payment permission required';end if;
 select * into r from public.payment_requests where id=request_id for update;
 if not found then raise exception 'Payment request not found';end if;
 if r.status='approved' then return;end if;
 if r.status<>'pending' or r.plan_snapshot is null then raise exception 'Only a validated pending request may be approved';end if;
 if r.amount_omr<>(r.plan_snapshot->>'price')::numeric or r.credits<>(r.plan_snapshot->>'credits')::integer or r.featured_projects<>(r.plan_snapshot->>'featured')::integer or r.days<>(r.plan_snapshot->>'days')::integer then raise exception 'Payment terms do not match the validated snapshot';end if;
 update public.users set plan=r.plan,subscription_status='active',remaining_projects=coalesce(remaining_projects,0)+r.credits,featured_projects=coalesce(featured_projects,0)+r.featured_projects,
 subscription_expires_at=now()+make_interval(days=>r.days),paid_owner_requests_enabled=true where auth_id=r.user_auth_id and not coalesce(is_blocked,false);
 get diagnostics affected=row_count;if affected<>1 then raise exception 'Account unavailable';end if;
 update public.payment_requests set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),admin_note=left(admin_note_text,2000),updated_at=now() where id=request_id;
end $$;
revoke all on function public.approve_payment_request(uuid,text) from public,anon;
grant execute on function public.approve_payment_request(uuid,text) to authenticated;
create or replace function public.reject_payment_request_v75(request_id uuid,reason text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare r public.payment_requests%rowtype;
begin
 if auth.uid() is null or not(public.is_admin_staff('payments') or public.is_admin_staff('plans')) then raise exception 'Payment permission required';end if;
 if length(trim(coalesce(reason,'')))<3 then raise exception 'Rejection reason required';end if;
 select * into r from public.payment_requests where id=request_id for update;
 if not found then raise exception 'Request not found';end if;
 if r.status='rejected' then return;end if;
 if r.status<>'pending' then raise exception 'An approved payment cannot be rejected';end if;
 update public.payment_requests set status='rejected',reviewed_by=auth.uid(),reviewed_at=now(),admin_note=left(reason,2000),updated_at=now() where id=request_id;
end $$;
revoke all on function public.reject_payment_request_v75(uuid,text) from public,anon;
grant execute on function public.reject_payment_request_v75(uuid,text) to authenticated;
-- Own-row permission must not let an owner approve or verify their own project.
create or replace function public.v75_protect_project_fields()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
declare editable text[]:=array['title','description','category','type','price','monthly_profit','location','whatsapp','image_url','updated_at'];
begin
 if current_user in ('postgres','supabase_admin','service_role') or public.is_admin_staff('projects') then return new;end if;
 if auth.uid() is null or old.owner_auth_id<>auth.uid() then raise exception 'Project ownership required';end if;
 if (to_jsonb(new)-editable) is distinct from (to_jsonb(old)-editable) then raise exception 'Project approval and system fields require administration';end if;
 return new;
end $$;
revoke all on function public.v75_protect_project_fields() from public,anon,authenticated;
drop trigger if exists v75_project_fields_guard on public.projects;
create trigger v75_project_fields_guard before update on public.projects for each row execute function public.v75_protect_project_fields();
alter table public.project_images enable row level security;
drop policy if exists "v75_image_owner_guard" on public.project_images;
create policy "v75_image_owner_guard" on public.project_images as restrictive for insert to public
with check(public.is_admin_staff('projects'));
drop policy if exists "v75_project_images_read" on public.project_images;
create policy "v75_project_images_read" on public.project_images for select to anon,authenticated using(exists(select 1 from public.projects p where p.id=project_images.project_id and (p.status in ('approved','active','published') or p.owner_auth_id=auth.uid() or public.is_admin_staff('projects'))));
drop policy if exists "v75_image_visibility" on public.project_images;
create policy "v75_image_visibility" on public.project_images as restrictive for select to public using(exists(select 1 from public.projects p where p.id=project_images.project_id and (p.status in ('approved','active','published') or p.owner_auth_id=auth.uid() or public.is_admin_staff('projects'))));
grant select on public.project_images to anon,authenticated;
commit;
