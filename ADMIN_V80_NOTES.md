# v80 Admin Mobile + Locale Route + Project Editor Patch

## Included
- Added localized admin routes so refresh works on `/om/ar/admin` and `/om/ar/admin/verifications`.
- Rebuilt admin mobile topbar to a compact app-style header.
- Admin side menu is a real side drawer on mobile.
- Project edit modal now includes the important Smart Form fields:
  - opportunity type
  - Arabic/English title
  - Arabic/English description
  - sector/category
  - location and coordinates
  - price, ROI, funding, partnership, franchise, profit
  - phone/WhatsApp country codes
  - moderation and verification fields
- Kept SQL unchanged.

## Note
This patch does not introduce new database fields. If a field does not exist in your `projects` table, Supabase may reject the update. Your previous SQL versions already added most Smart Form fields.
