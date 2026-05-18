# v90.1 Account Type Fix

This patch fixes the issue where the admin panel shows `account_type = both` but the user dashboard still behaves like `investor`.

Root cause: `getCurrentAppUser()` was reading legacy Supabase Auth first. Old Supabase `user_metadata.account_type` could override the Firebase-linked `public.users.account_type`.

Fix: Firebase is now the primary auth source; Supabase Auth is only a legacy fallback.
