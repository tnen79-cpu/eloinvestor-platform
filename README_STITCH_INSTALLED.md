# EloInvestor — exact Stitch homepage integration

The current homepage route (`/[country]/[lang]`, default `/om/ar`) renders the desktop/mobile HTML exports from the user-approved Stitch package exactly as exported, inside same-origin iframes so legacy CSS cannot alter appearance. Mobile is selected at widths <=767px. The frame resizes to the original exported document height.

Original exports: `public/stitch/desktop.html`, `public/stitch/mobile.html`. Original screenshots: `public/stitch/*-reference.png`. Preview: `/stitch-preview`.

`components/PublicChrome.tsx` intentionally hides the old shared header, footer and bottom navigation on the homepage only. Other routes, APIs and Supabase integration were left untouched.

**Limitations:** The exported HTML is a static visual design: original Stitch buttons and forms are not connected to live project search, login, investor workspace or seller dashboard. Existing app functionality is preserved at its original URLs, not inside the embedded Stitch homepage. The original CDN scripts, fonts and external imagery still require internet. No claim of full functional 1:1 migration is made.

Before production deployment, use a follow-up integration to replace static HTML elements with React components while retaining exact styling and connect real APIs. No `.env.local` or project secrets are included in the delivered ZIP.
