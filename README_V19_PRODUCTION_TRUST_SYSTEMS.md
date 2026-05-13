# EloInvestor Next v19 — Production Trust Systems

## Added
- Admin reports/moderation center.
- User-facing report popup for projects.
- Deal ratings/trust score flow.
- Admin ratings review tab.
- Admin action logs tab.
- SEO basics: `robots.txt`, `sitemap.xml`, enhanced metadata.
- Analytics events table foundation.
- Migration-safe SQL with no `create policy if not exists`.

## Required SQL
Run:

```sql
SUPABASE_V19_PRODUCTION_TRUST_SYSTEMS.sql
```

## Build
Tested with dummy Supabase env variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=dummy npm run build
```
