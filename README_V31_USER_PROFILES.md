# EloInvestor v31 — User Profiles

## Added
- Public profile page for every user: `/{country}/{lang}/profile/{id}`.
- Shows account role: investor, project owner, or both.
- Shows user projects, published ratings, followers count, trust score, and basic profile info.
- Added follow/unfollow button using `user_followers`.
- Project details page now shows the project owner name.
- Clicking the owner name opens the owner's public profile.

## SQL
Run:

```sql
SUPABASE_V31_USER_PROFILES.sql
```

## Notes
- The profile page is legacy-safe and supports different old user/project column names.
- The build compiled successfully and TypeScript finished; the environment timed out at the Next.js page-data collection stage.
