# EloInvestor Next v5 — Add Project Real Submit

## What changed

- Real protected add-project form.
- Saves projects into Supabase `projects` table.
- Uploads project images into Supabase Storage.
- Saves gallery rows into `project_images`.
- Sets new project status to `pending` for admin review.
- Saves selected country from route: `/om/ar/add-project` -> `country_code = om`.
- Includes city/governorate selector with country-aware defaults.

## Required Supabase setup

Create a public storage bucket named:

```txt
project-images
```

Or set a different bucket in `.env.local`:

```env
NEXT_PUBLIC_PROJECT_IMAGES_BUCKET=your-bucket-name
```

The project insert is built with fallback compatibility. If your `projects` table does not have one of the optional columns, the client removes that field and retries.

## Recommended table columns

Your `projects` table should ideally include:

```txt
id, title, description, category, opportunity_type, country_code,
governorate, city, location, price, monthly_profit, roi,
status, verification_status, cover_image_url, image_url, slug,
owner_auth_id, created_at
```

Your `project_images` table should include:

```txt
project_id, image_url, is_cover, sort_order
```

## Test

```bash
npm install
npm run dev
```

Then open:

```txt
http://localhost:3000/om/ar/add-project
```
