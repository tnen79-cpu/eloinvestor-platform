v52 - Forgot Password Page Rebuild

الإصلاحات:
- إعادة بناء login.html وتنظيف التكرار/الـ popup.
- إضافة صفحة forgot-password.html مستقلة.
- رابط "نسيت كلمة المرور؟" يفتح صفحة مستقلة بدل نافذة المتصفح.
- إرسال رابط الاستعادة من Supabase عبر data-forgot-password-form.
- الإبقاء على reset-password.html لتعيين كلمة المرور الجديدة.

مهم في Supabase:
Authentication > URL Configuration > Redirect URLs
أضف:
https://numou.agency/mmm/reset-password.html
