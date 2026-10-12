-- v75: owner edits return to review, with no publication credit charge.
begin;
create or replace function public.owner_edit_project_v75(project_key uuid,details jsonb,expected_details jsonb)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare p public.projects%rowtype;current_details jsonb;v_price numeric;v_profit numeric;
begin
 if auth.uid() is null then raise exception 'Authentication required';end if;
 select * into p from public.projects where id=project_key and owner_auth_id=auth.uid() for update;
 if not found or exists(select 1 from public.users where auth_id=auth.uid() and is_blocked) then raise exception 'Project ownership required';end if;
 current_details:=jsonb_build_object('title',p.title,'description',p.description,'category',p.category,'type',p.type,'price',p.price,'monthly_profit',p.monthly_profit,'location',p.location);
 if current_details=details then return p.id;end if;
 if current_details is distinct from expected_details then raise exception 'Project changed; reload before editing';end if;
 if jsonb_typeof(details) is distinct from 'object' or length(trim(coalesce(details->>'title','')))<5 or length(trim(coalesce(details->>'description','')))<80 or length(coalesce(details->>'title',''))>160 or length(coalesce(details->>'description',''))>12000 or length(trim(coalesce(details->>'location','')))=0 or length(coalesce(details->>'location',''))>200
 or coalesce(details->>'category','') not in ('restaurants','tech','commerce','services','contracting','realestate') or coalesce(details->>'type','') not in ('مشروع للبيع','شراكة','فكرة استثمارية') then raise exception 'Invalid project fields';end if;
 v_price:=(details->>'price')::numeric;v_profit:=nullif(details->>'monthly_profit','')::numeric;
 if v_price is null or v_price<=0 or v_price='NaN'::numeric or abs(v_price)>1000000000 or (v_profit is not null and (v_profit='NaN'::numeric or abs(v_profit)>1000000000)) then raise exception 'Invalid financial values';end if;
 update public.projects set title=trim(details->>'title'),description=trim(details->>'description'),category=details->>'category',type=details->>'type',price=v_price,monthly_profit=v_profit,location=trim(details->>'location'),status='pending',verification_status=case when verification_status='verified' then 'pending' else verification_status end where id=p.id;
 return p.id;
end $$;
revoke all on function public.owner_edit_project_v75(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.owner_edit_project_v75(uuid,jsonb,jsonb) to authenticated;
-- Deny direct owner edits so review cannot be bypassed by changing approved listings through REST.
create or replace function public.v75_protect_project_fields()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') or public.is_admin_staff('projects') then return new;end if;
 raise exception 'Owner edits must use the review submission API';
end $$;
commit;
