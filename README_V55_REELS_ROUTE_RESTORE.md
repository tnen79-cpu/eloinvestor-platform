# v55 Reels Route Restore

هذه النسخة مبنية على v53 المستقرة وليس v54، حتى لا تتعطل صفحات /[country]/[lang].

## تم إصلاح
- رجوع كل الصفحات العامة مثل /om/ar و /om/ar/opportunities.
- صفحة الريلز تقرأ الفيديوهات من جدول project_videos مباشرة.
- فلترة الريلز صارت مرنة حتى لا تختفي الفيديوهات بسبب status أو country_code فارغ.
- إضافة middleware لدعم الروابط القديمة:
  - /ar/reels -> /om/ar/reels
  - /reels -> /om/ar/reels
  - /opportunities -> /om/ar/opportunities
- الإدارة /admin لا تتأثر.

## لا يحتاج SQL جديد
إذا كنت شغلت SQL v52/v53/v54 الخاص بالفيديوهات، لا تحتاج تشغيل شيء جديد.
