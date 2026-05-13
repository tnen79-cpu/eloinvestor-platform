# EloInvestor Next v7 — Admin System

## Added
- Real admin dashboard at `/admin`
- Admin guard based on `users.role = admin`
- Projects management: approve, reject, request revision, delete
- Countries management: add/edit/enable/disable/default country
- Homepage slider management
- Users overview
- Admin statistics

## Required Supabase setup
Make sure your admin account has one of:

```sql
update users
set role = 'admin'
where email = 'YOUR_EMAIL_HERE';
```

If `role` column does not exist:

```sql
alter table users add column if not exists role text default 'user';
```

## Recommended RLS policies
Admin dashboard uses the logged-in user's JWT and anon key. Your RLS must allow admin users to read/update projects, countries, slides, and users.
