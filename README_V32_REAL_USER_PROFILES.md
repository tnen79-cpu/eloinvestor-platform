# v32 Real User Profiles

## Added
- Public profile page redesigned using the uploaded layout.
- Blue verified badge next to verified profile names.
- Email hidden from public profiles.
- Profile shows account type, bio, location, phone masked, stats, projects, ratings, followers.
- Project details page links owner name/card to public profile.
- Avatar upload inside dashboard profile tab.
- Supabase SQL: `SUPABASE_V32_REAL_USER_PROFILES.sql`.

## Required
Run SQL in Supabase before testing avatar/follow/profile views:
`SUPABASE_V32_REAL_USER_PROFILES.sql`

## Notes
- Public profile route: `/om/ar/profile/[userId-or-profile_slug]`
- Avatar bucket: `profile-avatars`
- Public view hides email intentionally.
