# V34.8 Promotion Counters Fix

هذه النسخة تصلح مشكلة بقاء إحصائيات الترويج على صفر.

## ما الذي تغير؟

- عند فتح صفحة مشروع مروّج يتم زيادة `promotion_views`.
- عند الضغط على كرت مشروع ممول يتم زيادة `promotion_clicks`.
- عند الضغط على واتساب / اتصال / دردشة ويتم إنشاء طلب تواصل يتم زيادة `promotion_contacts`.
- في لوحة الإدارة إذا تم قبول الطلب يظهر الزر كـ **قيد الترويج** بدل زر قبول.

## مهم جدًا

شغّل ملف SQL التالي داخل Supabase SQL Editor:

`SUPABASE_V34_8_PROMOTION_COUNTERS_FIX.sql`

بدون هذا الملف لن تعمل دالة العداد الجديدة `increment_active_promotion_metric`.
