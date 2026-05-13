# EloInvestor v18.4 Admin Features Fix

## What changed
- Fixed admin accounts list so normal users no longer appear as admin accounts.
- Added user account edit modal in Admin > Users.
- Added project edit modal in Admin > Projects.
- Added project gallery management: add image URL and delete old image.
- Replaced browser prompt popups for verification/upgrade notes with platform-native modal.
- Verification requests now display user name/email and project title instead of raw IDs.
- Added Admin > Ads/Banners tab for promotional banners across pages.
- Added SQL migration safe for users RLS, admin permissions, platform_ads, project_images.

## Required SQL
Run `SUPABASE_V18_4_ADMIN_FEATURES_FIX.sql` in Supabase SQL Editor using RUN, not EXPLAIN.
