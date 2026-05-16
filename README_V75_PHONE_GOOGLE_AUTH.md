# v75 Phone OTP + Google Auth

## What changed

- Login uses phone OTP instead of email/password.
- Register uses phone OTP and then creates/updates the public `users` profile.
- Added Google OAuth button to login and register.
- Added OAuth callback page:
  - `/{country}/{lang}/auth/callback`
- Kept profile compatibility with existing `users` table.

## Supabase setup required

### Phone OTP

In Supabase Dashboard:

1. Authentication
2. Providers
3. Phone
4. Enable Phone provider
5. Configure your SMS provider

### Google OAuth

In Supabase Dashboard:

1. Authentication
2. Providers
3. Google
4. Enable Google
5. Add Client ID and Client Secret

Add redirect URL:

```text
https://your-domain.com/om/ar/auth/callback
```

For local dev:

```text
http://localhost:3000/om/ar/auth/callback
```

## SQL

Run:

```text
SUPABASE_V75_PHONE_GOOGLE_AUTH.sql
```

## Notes

- Phone input accepts numbers only.
- Country code is separated from phone number.
- OTP verification uses Supabase `verifyOtp` with `type: 'sms'`.
- Google OAuth uses `signInWithOAuth`.
