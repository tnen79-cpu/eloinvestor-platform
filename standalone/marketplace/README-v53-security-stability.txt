إلو مستثمر v53 — Security & Stability Hardening

الإصلاحات:
- عدادات المشاهدات/التواصل صارت عبر RPC atomic: increment_project_counter.
- إضافة RLS أساسي على جدول users.
- إصلاح شارة إشعارات الأدمن لتكون ديناميكية بدل الرقم الثابت 3.
- توحيد إصدار app.js إلى v53.0.0 في كل الصفحات.
- إصلاح next= بعد تسجيل الدخول محفوظ في auth.js.
- حذف activatePlanDemo من الإنتاج.
- خصم remaining_projects عبر RPC consume_project_credit بدل تحديث مباشر فقط من الواجهة.
- منع تخزين بيانات الملف الشخصي كاملة في localStorage.
- جعل admin-guard ينتظر config/Supabase بدل طرد المدير بسبب race condition.
- إضافة معالجة عامة لانتهاء الجلسة.
- إغلاق قناة Realtime notifications عند مغادرة الصفحة.
- إضافة حماية محاولات تسجيل الدخول المتكررة.
- منع loadProjects legacy من التصادم مع loadMarketplaceProjects.

مهم:
شغّل ملف SQL:
supabase/v53-security-stability-hardening.sql
