-- v75: one transaction for message, conversation counters and notification.
begin;
alter table public.chat_messages add column if not exists client_message_id uuid;
create unique index if not exists v75_chat_message_unique on public.chat_messages(sender_auth_id,client_message_id) where client_message_id is not null;
create or replace function public.send_chat_message_v75(message_key uuid,conversation_key uuid,message_text text,attachment jsonb default null)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare c public.chat_conversations%rowtype;m public.chat_messages%rowtype;other uuid;mid uuid;path text;body_text text;
begin
 if auth.uid() is null or message_key is null then raise exception 'Authentication and message key required';end if;
 select * into c from public.chat_conversations where id=conversation_key for update;
 if not found or auth.uid() not in (c.owner_auth_id,c.investor_auth_id) then raise exception 'Conversation permission required';end if;
 other:=case when auth.uid()=c.owner_auth_id then c.investor_auth_id else c.owner_auth_id end;
 select * into m from public.chat_messages where sender_auth_id=auth.uid() and client_message_id=message_key;
 if found then
  if m.conversation_id<>conversation_key or coalesce(m.body,'')<>trim(coalesce(message_text,'')) or coalesce(m.attachment_url,'')<>coalesce(attachment->>'attachment_url','') or coalesce(m.attachment_name,'')<>coalesce(attachment->>'attachment_name','') then raise exception 'Message key reused for different content';end if;
  return m.id;
 end if;
 if c.is_closed then raise exception 'Conversation is closed';end if;
 if exists(select 1 from public.users where auth_id=auth.uid() and is_blocked) then raise exception 'Account blocked';end if;
 body_text:=trim(coalesce(message_text,''));
 if length(body_text)>5000 or (body_text='' and attachment is null) then raise exception 'Invalid message';end if;
 if attachment is not null then
  path:=public.v75_object_path(attachment->>'attachment_url','chat-attachments');
  if path is null or split_part(path,'/',1)<>auth.uid()::text or split_part(path,'/',2)<>c.id::text or not exists(select 1 from storage.objects where bucket_id='chat-attachments' and name=path) then raise exception 'Invalid conversation attachment';end if;
 end if;
 insert into public.chat_messages(conversation_id,sender_auth_id,receiver_auth_id,body,attachment_url,attachment_name,attachment_type,attachment_size,delivered_at,client_message_id)
 values(c.id,auth.uid(),other,nullif(body_text,''),attachment->>'attachment_url',left(attachment->>'attachment_name',200),attachment->>'attachment_type',(attachment->>'attachment_size')::bigint,now(),message_key) returning id into mid;
 update public.chat_conversations set last_message=left(coalesce(nullif(body_text,''),'مرفق'),180),last_message_at=now(),updated_at=now(),unread_owner=coalesce(unread_owner,0)+case when auth.uid()=c.investor_auth_id then 1 else 0 end,unread_investor=coalesce(unread_investor,0)+case when auth.uid()=c.owner_auth_id then 1 else 0 end where id=c.id;
 insert into public.notifications(user_auth_id,title,message,type,link_url,created_by) values(other,'رسالة جديدة','لديك رسالة جديدة في المنصة.','chat','chat.html?conversation='||c.id::text,auth.uid());
 return mid;
end $$;
revoke all on function public.send_chat_message_v75(uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.send_chat_message_v75(uuid,uuid,text,jsonb) to authenticated;
drop policy if exists "v75_chat_insert_gate" on public.chat_messages;
create policy "v75_chat_insert_gate" on public.chat_messages as restrictive for insert to public with check(false);
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
drop policy if exists "v75_conversation_private_guard" on public.chat_conversations;
create policy "v75_conversation_private_guard" on public.chat_conversations as restrictive for select to public
using(auth.uid() is not null and (auth.uid() in (owner_auth_id,investor_auth_id) or public.is_admin_staff('chat_moderation')));
drop policy if exists "v75_message_private_guard" on public.chat_messages;
create policy "v75_message_private_guard" on public.chat_messages as restrictive for select to public
using(auth.uid() is not null and exists(select 1 from public.chat_conversations c where c.id=conversation_id and (auth.uid() in (c.owner_auth_id,c.investor_auth_id) or public.is_admin_staff('chat_moderation'))));
drop policy if exists "v75_conversation_owner_guard" on public.chat_conversations;
create policy "v75_conversation_owner_guard" on public.chat_conversations as restrictive for insert to public
with check(auth.uid() is not null and auth.uid() in (owner_auth_id,investor_auth_id) and exists(select 1 from public.projects p where p.id=project_id and p.owner_auth_id=chat_conversations.owner_auth_id));
create or replace function public.v75_protect_conversation_identity()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') then return new;end if;
 if new.id is distinct from old.id or new.project_id is distinct from old.project_id or new.owner_auth_id is distinct from old.owner_auth_id or new.investor_auth_id is distinct from old.investor_auth_id then raise exception 'Conversation identity is immutable';end if;
 return new;
end $$;
revoke all on function public.v75_protect_conversation_identity() from public,anon,authenticated;
drop trigger if exists v75_conversation_identity on public.chat_conversations;
create trigger v75_conversation_identity before update on public.chat_conversations for each row execute function public.v75_protect_conversation_identity();
create or replace function public.v75_protect_message_identity()
returns trigger language plpgsql security invoker set search_path=pg_catalog,public as $$
begin
 if current_user in ('postgres','supabase_admin','service_role') or public.is_admin_staff('chat_moderation') then return new;end if;
 if auth.uid() is null or auth.uid()<>old.receiver_auth_id or (to_jsonb(new)-array['read_at','delivered_at']) is distinct from (to_jsonb(old)-array['read_at','delivered_at']) then raise exception 'Only the receiver may update delivery or read status';end if;
 return new;
end $$;
revoke all on function public.v75_protect_message_identity() from public,anon,authenticated;
drop trigger if exists v75_message_identity on public.chat_messages;
create trigger v75_message_identity before update on public.chat_messages for each row execute function public.v75_protect_message_identity();

create or replace function public.transaction_flows_ready_v75()
returns boolean language sql stable security invoker set search_path=pg_catalog,public as $$
 select auth.uid() is not null and public.marketplace_security_ready() and public.private_files_ready_v75()
 and to_regclass('public.marketplace_projects') is not null
 and not has_column_privilege('anon','public.projects','whatsapp','select')
 and to_regprocedure('public.owner_edit_project_v75(uuid,jsonb,jsonb)') is not null
 and to_regprocedure('public.publish_project_v75(uuid,jsonb,jsonb,jsonb)') is not null
 and to_regprocedure('public.request_payment_v75(uuid,text,text,text,text,jsonb)') is not null
 and to_regprocedure('public.send_chat_message_v75(uuid,uuid,text,jsonb)') is not null
 and exists(select 1 from pg_policies where schemaname='public' and tablename='projects' and policyname='v75_project_insert_gate' and permissive='RESTRICTIVE');
$$;
revoke all on function public.transaction_flows_ready_v75() from public,anon;
grant execute on function public.transaction_flows_ready_v75() to authenticated;
commit;
