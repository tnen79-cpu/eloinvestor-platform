إلو مستثمر - v20 Admin Control Center

التغييرات الفعلية:
- إعادة بناء لوحة الإدارة داخل assets/js/admin.js.
- كروت حديثة للمشاريع بدل الجداول الثقيلة.
- Project Review Drawer داخل نفس اللوحة.
- عرض صور المشروع من project_images أو image_url.
- عرض بيانات صاحب المشروع.
- عرض مستندات التوثيق من verification_files.
- قبول / رفض / طلب تعديل / تحديث حالة توثيق المشروع من داخل الملف.
- مركز توثيق يعرض ملفات project / investor مع قبول ورفض.
- Analytics cards + مؤشرات أداء بسيطة من البيانات المتاحة.
- Activity Logs بتسميات أوضح.
- بحث وفلاتر للمشاريع والمستخدمين والتوثيق.
- تحسين Responsive للموبايل.

مهم بعد رفع النسخة:
1) شغّل ملف Supabase:
   supabase/v20-admin-control-center.sql
2) اعمل Hard Refresh للمتصفح لأن app.js صار v20.0.0.
3) تأكد أن Storage buckets المستخدمة عندك موجودة:
   project-images
   verification-files

ملاحظة:
إذا بعض الإحصائيات طلعت 0، فهذا يعني أن الأعمدة مثل views_count / contacts_count موجودة لكن لم تُحدّث بعد من الواجهة العامة.
