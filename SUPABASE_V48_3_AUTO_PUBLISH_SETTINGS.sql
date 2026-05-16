-- v48.3 Auto/manual project publishing settings

create table if not exists public.platform_settings (
  id uuid primary key default gen_random_uuid(),
  key text,
  value text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.platform_settings add column if not exists key text;
alter table public.platform_settings add column if not exists value text;
alter table public.platform_settings add column if not exists created_at timestamptz default now();
alter table public.platform_settings add column if not exists updated_at timestamptz default now();

update public.platform_settings
set key = coalesce(key, id::text)
where key is null;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'platform_settings_key_unique'
  ) THEN
    ALTER TABLE public.platform_settings
    ADD CONSTRAINT platform_settings_key_unique UNIQUE (key);
  END IF;
END $$;

insert into public.platform_settings (key, value, updated_at)
values ('project_publish_mode', 'auto', now())
on conflict (key) do nothing;

alter table public.projects add column if not exists approval_status text default 'pending';
alter table public.projects add column if not exists verification_status text default 'pending';
alter table public.projects add column if not exists is_verified boolean default false;

-- Recommended default: projects are published automatically; verification remains admin-only.
update public.platform_settings
set value = coalesce(nullif(value, ''), 'auto'), updated_at = now()
where key = 'project_publish_mode';
