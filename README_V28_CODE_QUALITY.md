# EloInvestor v28 Code Quality Pass

## What changed

### 1. Feature folders for large dashboards
- `components/AdminDashboard.tsx` is now a tiny compatibility export.
- Real admin implementation moved to `components/admin/AdminDashboardCore.tsx`.
- `components/UserDashboardGate.tsx` is now a tiny compatibility export.
- Real user dashboard implementation moved to `components/dashboard/UserDashboardGateCore.tsx`.

This keeps old imports working while opening the door to split admin/users/projects panels gradually.

### 2. MobileActionDock navigation fix
- The mobile “Suggested / مقترحة” button now opens a real route:
  - `/:country/:lang/suggested`
- Added a dedicated `suggested` page that renders smart recommendations and links to interests.

### 3. CSS split
- `app/globals.css` now holds the shared platform/admin/internal styles.
- `app/landing.css` holds the landing/v16 marketing identity styles.
- Root layout imports both files.

### 4. Suspense around searchParams client usage
- `AdvancedSearchControls` is wrapped in `<Suspense>` from the opportunities page.
- Added a lightweight skeleton fallback class.

### 5. Error boundaries
Added error boundaries for:
- Global app: `app/error.tsx`
- Platform routes: `app/[country]/[lang]/error.tsx`
- Admin routes: `app/admin/error.tsx`

This prevents Supabase/client-side failures from crashing the entire experience without a friendly recovery button.

## Build note
The uploaded ZIP did not include a complete `node_modules` install for Next/React in this environment, so local build could not be executed here. Run locally after extraction:

```bash
npm install
npm run build
```
