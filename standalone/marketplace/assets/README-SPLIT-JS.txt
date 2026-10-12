تقسيم ملفات JavaScript لمنصة إلو مستثمر
=======================================

ارفع مجلد assets/js كامل مكان القديم.

الصفحات لا تحتاج تغيير إذا كانت تستخدم:
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="assets/js/app.js?v=11"></script>

مهم:
- app.js صار Loader خفيف.
- يجب رفع كل الملفات التالية:
  config.js
  utils.js
  auth.js
  projects.js
  project-details.js
  dashboard.js
  admin.js
  plans.js
  app-init.js

لو صفحة لم تعمل، تأكد من:
1) Supabase script موجود قبل app.js
2) رفعت كل ملفات assets/js
3) افتح الصفحة مع ?v=11 لكسر الكاش
