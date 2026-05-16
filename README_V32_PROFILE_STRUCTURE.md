# V32 Profile Structure

This build converts the provided profile/project-detail mockup into real platform structure.

## Added
- Public profile page layout inspired by the provided mockup.
- Facebook-style blue verified check beside verified profile names.
- Role display: investor / owner / both.
- Projects inside profile page.
- Ratings/reviews inside profile page.
- Follow profile button.
- Private email hidden from public profile UI.
- Phone/WhatsApp masked on public profile.
- Owner card in project details links to public profile.
- Profile avatar upload for the profile owner.
- SQL migration for avatar storage, user followers, ratings, and public profile view.

## Required SQL
Run:
`SUPABASE_V32_PROFILE_STRUCTURE.sql`

## Notes
- Profile avatar uploads use Supabase Storage bucket `profile-avatars`.
- Public profile route: `/[country]/[lang]/profile/[id]`.
- My public profile redirect: `/[country]/[lang]/profile`.
