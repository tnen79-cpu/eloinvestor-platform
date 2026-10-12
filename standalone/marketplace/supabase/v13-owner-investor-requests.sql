-- إلو مستثمر v13 - إظهار بيانات المستثمر لصاحب المشروع في طلبات المستثمرين
-- شغل هذا بعد ملفات v11/v12 في Supabase SQL Editor.

-- تأكد أن الجداول موجودة
create table if not exists public.investor_contacted_projects (
  id uuid primary key default gen_random_uuid(),
  investor_auth_id uuid not null,
  project_id uuid not null,
  project_snapshot jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  unique(investor_auth_id, project_id)
);

alter table public.investor_contacted_projects enable row level security;

-- المستثمر يقرأ/يسجل تواصله
DROP POLICY IF EXISTS "contacted own read" ON public.investor_contacted_projects;
CREATE POLICY "contacted own read"
ON public.investor_contacted_projects
FOR SELECT
USING (auth.uid() = investor_auth_id);

DROP POLICY IF EXISTS "contacted own upsert" ON public.investor_contacted_projects;
CREATE POLICY "contacted own upsert"
ON public.investor_contacted_projects
FOR INSERT
WITH CHECK (auth.uid() = investor_auth_id);

-- صاحب المشروع يقرأ طلبات التواصل الخاصة بمشاريعه فقط
DROP POLICY IF EXISTS "owners can read contacts for own projects" ON public.investor_contacted_projects;
CREATE POLICY "owners can read contacts for own projects"
ON public.investor_contacted_projects
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = investor_contacted_projects.project_id
      AND (
        p.owner_auth_id = auth.uid()
        OR p.owner_id = auth.uid()
        OR p.created_by = auth.uid()
      )
  )
);

-- السماح لصاحب المشروع بقراءة بيانات المستثمر الأساسية فقط من جدول users
-- ملاحظة: إذا عندك Policy موجودة على users قد تحتاج تدمج الشرط معها.
DROP POLICY IF EXISTS "owners can read investors who contacted own projects" ON public.users;
CREATE POLICY "owners can read investors who contacted own projects"
ON public.users
FOR SELECT
USING (
  auth.uid() = auth_id
  OR EXISTS (
    SELECT 1
    FROM public.investor_contacted_projects c
    JOIN public.projects p ON p.id = c.project_id
    WHERE c.investor_auth_id = users.auth_id
      AND (
        p.owner_auth_id = auth.uid()
        OR p.owner_id = auth.uid()
        OR p.created_by = auth.uid()
      )
  )
);
