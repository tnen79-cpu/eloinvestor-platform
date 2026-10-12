# Static marketplace checkpoint v76

`marketplace/` contains the complete HTML/CSS/JavaScript checkpoint developed from the v72 ZIP, including the v73–v76 improvements and their tests. The repository root remains the existing Next.js application. These files have not been integrated into its routes or published.

Changes include filtering and comparison, investor review workspace, private files and atomic submission/payment/chat flows, audited document/publication decisions, replacement history, and consent-based owner leads.

See `marketplace/README-v76-review-and-leads.md` and `marketplace/README-v75-core-flows.md` for migration order, requirements and known limitations. SQL has not been applied to the live Supabase project because administrative access was denied. Static review screens contain Arabic dynamic text; English coverage is incomplete.

Validation: all 11 local test groups passed, plus JavaScript syntax and internal links. Local DOM/PGlite checks do not constitute live Supabase or browser visual end-to-end validation.

```sh
cd standalone/marketplace
npm ci
npm test
```

Serve this folder as the document root to try its static pages. Its readiness guards block sensitive operations until the required migrations are available. Do not apply the migrations to the Next.js application's database without comparing schemas and authorization rules first; their compatibility with that application has not been verified.

The root TypeScript and ESLint configs exclude this independent checkpoint. Its loader test waits for the actual error UI rather than relying on a 10ms timer.
