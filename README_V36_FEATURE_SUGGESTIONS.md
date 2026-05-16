# EloInvestor v36 — Feature Suggestions Implementation

اعتماداً على ملف مقترحات المميزات، تم تنفيذ حزمة v36 فوق نسخة v35.

## ما تم إضافته

### الترويج والإيرادات
- باقات ترويج متعددة: 24 ساعة، أسبوع، شهر، ربع سنوي.
- نص توفير تلقائي للباقة الشهرية والربع سنوية.
- تنبيه تجديد الترويج قبل الانتهاء عبر SQL function: `notify_promotions_expiring_soon()`.
- تقرير أداء الترويج داخل لوحة المستخدم: المشاهدات، النقرات، التواصل.
- تقرير إيرادات شهرية داخل لوحة الإدارة.
- تصدير CSV لطلبات الترويج.

### البحث والاكتشاف
- تنبيهات البحث المحفوظ للمستثمرين.
- جدول `saved_searches` + function: `notify_saved_search_matches()`.
- صفحة خريطة المشاريع: `/{country}/{lang}/map`.
- مقارنة المشاريع: زر قارن على كرت المشروع + صفحة `/{country}/{lang}/compare`.

### تجربة المستخدم والثقة
- التقييم بالنجوم للمستثمرين الذين تواصلوا فعلياً مع المشروع فقط.
- عرض تقييمات المشروع المنشورة في صفحة التفاصيل.
- بوابة NDA رقمية للمشاريع والمستندات الحساسة.
- إبقاء الأسئلة والأجوبة العامة ظاهرة ضمن صفحة المشروع.

### لوحة الإدارة
- عند قبول طلب الترويج يتحول إلى حالة قيد الترويج.
- إحصائيات ترويج شاملة للإدارة.
- تقرير إيرادات شهرية.
- زر تصدير CSV في طلبات الترويج.

## ملفات مهمة
- `SUPABASE_V36_FEATURE_SUGGESTIONS.sql`
- `components/SavedSearchesPanel.tsx`
- `components/CompareProjectButton.tsx`
- `components/NdaAcceptanceGate.tsx`
- `app/[country]/[lang]/map/page.tsx`
- `app/[country]/[lang]/compare/page.tsx`

## خطوات التشغيل
1. ارفع الكود.
2. شغّل SQL:
   `SUPABASE_V36_FEATURE_SUGGESTIONS.sql`
3. شغّل:
   `npm install`
4. ثم:
   `npm run build`

## ملاحظات الفحص
- `npx tsc --noEmit` نجح.
- `npm run build` نجح في التجميع و TypeScript، ثم طال عند مرحلة `Collecting page data` بسبب وقت البيئة، مثل النسخ السابقة.
