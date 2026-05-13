# EloInvestor Next v8 — Arabic Slug Route Fix

## What changed
- Project URLs now use `project.id` when available instead of Arabic slug.
- New project slugs are generated as ASCII-safe values only.
- Project details lookup now queries `id` and `slug` separately to avoid Supabase/PostgREST issues with Arabic or encoded slugs.
- Links are encoded using `encodeURIComponent`.

## Optional SQL cleanup for old Arabic slugs
Run this in Supabase to convert existing Arabic/unsafe slugs into safe IDs:

```sql
alter table projects add column if not exists slug text;

update projects
set slug = 'project-' || left(id::text, 8)
where slug is null
   or slug = ''
   or slug ~ '[^a-zA-Z0-9_-]';

create unique index if not exists projects_slug_unique
on projects(slug);

notify pgrst, 'reload schema';
```
