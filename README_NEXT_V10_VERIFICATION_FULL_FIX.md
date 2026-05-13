# EloInvestor Next v10 — Verification Full Fix

This version fixes the verification system without depending on missing columns.

## What was fixed

- `project_title` missing column
- `country_code` missing column
- `note` / `notes` mismatch
- `type` / `request_type` mismatch
- project list now reads both `owner_auth_id` and `user_auth_id`
- removed bad project lookup columns that caused Supabase 400 errors
- Supabase client no longer silently uses placeholder keys

## Required SQL

Run this file in Supabase SQL Editor:

```txt
SUPABASE_V10_VERIFICATION_FULL_FIX.sql
```

## Storage

Create a public Storage bucket:

```txt
verification-files
```

## Run locally

```bash
npm install
npm run dev
```
