v50 إصلاح مهتم بالفرصة + نسيت كلمة المرور

الإصلاحات:
1) زر مهتم بالفرصة صار يعمل من صفحة تفاصيل المشروع.
2) تسجيل الاهتمام يحفظ في project_interests مع منع التكرار.
3) إرسال إشعار لصاحب المشروع عند اهتمام مستثمر.
4) نسيت كلمة المرور ترسل رابط استعادة عبر Supabase.
5) صفحة reset-password.html لتعيين كلمة مرور جديدة.

مهم:
- شغّل supabase/v50-interest-forgot-password-fix.sql
- في Supabase Authentication > URL Configuration أضف رابط الموقع ضمن Redirect URLs، مثال:
  https://numou.agency/mmm/reset-password.html
