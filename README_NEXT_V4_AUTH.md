# EloInvestor Next v4 — Auth + User Flow

## What changed

- Added Supabase browser auth client.
- Added working Login form.
- Added working Register form.
- Header now reads the current logged-in user.
- Header hides Login/Register after login.
- Header shows user dropdown with Dashboard, Add Project, Admin for admins, and Logout.
- Added protected Add Project placeholder.
- Added protected User Dashboard placeholder.
- Mobile nav now points to Account/Dashboard.

## Required env

Create `.env.local` locally:

```env
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Do not commit `.env.local`.

## Run

```bash
npm install
npm run dev
```

## Test

- `/om/ar/login`
- `/om/ar/register`
- `/om/ar/dashboard`
- `/om/ar/add-project`

## Notes

The real Add Project save and image upload flow will be connected in v5.
