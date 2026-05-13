# EloInvestor Next.js v2 — Supabase Data Layer

هذه النسخة تربط الواجهة الجديدة مع Supabase للقراءة الحقيقية:

- قراءة الدول من `platform_countries`
- قراءة المشاريع من `projects`
- فلترة المشاريع حسب `country_code`
- fallback للداتا التجريبية إذا تعذر الاتصال أو كانت RLS تمنع القراءة

## المطلوب

1. تأكد أن `.env.local` يحتوي:

```env
NEXT_PUBLIC_SUPABASE_URL=https://khzlqesyhkmucewiwmkg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_H-_oWH1MCm7IGHCwN4GgrA_liCtk90Z
```

2. شغّل:

```bash
npm install
npm run dev
```

3. افتح:

```txt
http://localhost:3000/om/ar
http://localhost:3000/om/ar/opportunities
```

## ملاحظات مهمة

- إذا ظهرت دول/مشاريع وهمية، السبب غالبًا RLS أو عدم وجود بيانات منشورة.
- صفحة الدول في الهيدر تقرأ فقط الدول `is_active = true`.
- المشاريع تُفلتر حسب `country_code` بحروف صغيرة مثل `om`, `qa`.
