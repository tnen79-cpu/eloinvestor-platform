-- v75: private receipt, verification and conversation attachment storage.
begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
('payment-receipts','payment-receipts',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']),
('verification-files','verification-files',false,8388608,array['image/jpeg','image/png','image/webp','application/pdf']),
('chat-attachments','chat-attachments',false,10485760,array['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
('project-images','project-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
alter table storage.objects enable row level security;
drop policy if exists "v75_private_objects_guard" on storage.objects;
create policy "v75_private_objects_guard" on storage.objects as restrictive for all to public
using (
 bucket_id not in ('payment-receipts','verification-files','chat-attachments')
 or (auth.uid() is not null and (
   split_part(name,'/',1)=auth.uid()::text
   or (bucket_id='payment-receipts' and (public.is_admin_staff('payments') or public.is_admin_staff('plans')))
   or (bucket_id='verification-files' and public.is_admin_staff('verification'))
   or (bucket_id='chat-attachments' and (public.is_admin_staff('chat_moderation') or exists(select 1 from public.chat_conversations c where c.id::text=split_part(storage.objects.name,'/',2) and (c.owner_auth_id=auth.uid() or c.investor_auth_id=auth.uid()))))
  ))
)
with check (bucket_id not in ('payment-receipts','verification-files','chat-attachments') or (auth.uid() is not null and split_part(name,'/',1)=auth.uid()::text and (bucket_id<>'chat-attachments' or exists(select 1 from public.chat_conversations c where c.id::text=split_part(storage.objects.name,'/',2) and (c.owner_auth_id=auth.uid() or c.investor_auth_id=auth.uid()) and not c.is_closed))));
drop policy if exists "v75_private_objects_read" on storage.objects;
create policy "v75_private_objects_read" on storage.objects for select to authenticated
using (bucket_id in ('payment-receipts','verification-files','chat-attachments'));
drop policy if exists "v75_private_objects_upload" on storage.objects;
create policy "v75_private_objects_upload" on storage.objects for insert to authenticated
with check(bucket_id in ('payment-receipts','verification-files','chat-attachments') and split_part(name,'/',1)=auth.uid()::text);

alter table public.verification_files enable row level security;
drop policy if exists "v75_verification_private_guard" on public.verification_files;
create policy "v75_verification_private_guard" on public.verification_files as restrictive for all to public
using(auth.uid() is not null and (owner_auth_id=auth.uid() or public.is_admin_staff('verification')))
with check(auth.uid() is not null and (public.is_admin_staff('verification') or (owner_auth_id=auth.uid() and status='pending'
 and public.v75_object_path(file_url,'verification-files') is not null
 and split_part(public.v75_object_path(file_url,'verification-files'),'/',1)=auth.uid()::text
 and ((target_type='investor' and project_id is null) or (target_type='project' and exists(select 1 from public.projects p where p.id=verification_files.project_id and p.owner_auth_id=auth.uid()))))));
drop policy if exists "v75_verification_read" on public.verification_files;
create policy "v75_verification_read" on public.verification_files for select to authenticated using(owner_auth_id=auth.uid() or public.is_admin_staff('verification'));

-- Boolean-only API, with explicit authentication. No object names or documents are returned.
create or replace function public.private_files_ready_v75()
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null
 and (select count(*)=3 and bool_and(not b.public) from storage.buckets b where b.id in ('payment-receipts','verification-files','chat-attachments'))
 and exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='v75_private_objects_guard' and permissive='RESTRICTIVE');
$$;
revoke all on function public.private_files_ready_v75() from public,anon;
grant execute on function public.private_files_ready_v75() to authenticated;
commit;
