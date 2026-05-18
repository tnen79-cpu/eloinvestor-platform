# EloInvestor v82 — Launch fixes applied

Based on the uploaded audit report, this build applies the launch-critical and practical fixes:

## Critical fixes
- Fixed admin links in header and dashboard to use localized route: /{country}/{lang}/admin.
- Added onboarding to middleware root route redirects.
- Added real href attributes for footer social links instead of empty anchors.
- Connected package subscription buttons to the Thawani payment session API.
- Added .env.local.example for deployment setup.
- Improved map page with direct Google Maps links for project coordinates.
- Added JSON-LD structured data to project details pages.

## UX fixes
- Added dashboard/account shortcut to the mobile action dock.
- Added notifications shortcut inside mobile drawer.
- Improved mobile dashboard drawer labels for Arabic/English.
- Improved auth error message styling so errors are visually distinct.
- Replaced About / Privacy / Terms stubs with launch-ready Arabic/English content.

## Notes before production
- Replace placeholder footer social links with official EloInvestor accounts.
- Replace WhatsApp placeholder wa.me/96800000000 with the official support number.
- Configure Supabase Auth providers and Thawani keys in Vercel environment variables.
- Run a live test for Google login, Phone OTP, package payment, project publishing, verification upload, chat, and promotion flow.
