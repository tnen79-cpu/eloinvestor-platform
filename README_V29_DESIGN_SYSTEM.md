# EloInvestor v29 — Marketplace Design System

تم تنفيذ نسخة v29 على أساس الموكاب الأخير `eloinvestor_homepage_mockup_v_1.html`.

## أهم التغييرات
- اعتماد هوية Marketplace أقرب للسوق المفتوح/OpenSooq لكن بلمسة استثمارية.
- إعادة بناء الصفحة الرئيسية بالكامل: Header + Search + Category bar + Hero + Live panel + Trust bar + Dynamic sectors + Project cards + Metrics + CTA.
- تحديث Header العام ليحتوي شريط بحث سريع وأزرار واضحة.
- توحيد كروت المشاريع مع التصميم الجديد: صورة، badges، بيانات مختصرة، مؤشرات، وسعر.
- دعم القطاعات الديناميكية من لوحة الإدارة مع image/icon.
- تحسين تصميم الصفحات الداخلية عبر طبقة CSS موحدة لتتناسق مع الرئيسية.
- الحفاظ على ربط البيانات الحقيقي من Supabase بدون إضافة بيانات وهمية جديدة.

## ملاحظة
لم يتم فرض SQL جديد في هذا الإصدار. يعتمد على جداول v25/v28 الحالية، خصوصًا `platform_sectors` للمناطق/القطاعات.

## التشغيل
```bash
npm install
npm run dev
```

## البناء
```bash
npm run build
```
