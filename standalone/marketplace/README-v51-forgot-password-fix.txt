v51 Forgot Password Real Fix

الإصلاحات:
- إصلاح خطأ event delegation في زر نسيت كلمة المرور.
- redirectTo صار يبنى بشكل صحيح من reset-password.html.
- صفحة reset-password تدعم روابط Supabase بصيغة ?code= أو #access_token.
- تحديث cache version إلى 51.

مهم في Supabase:
Authentication > URL Configuration
أضف الرابط التالي ضمن Redirect URLs حسب دومينك:
https://numou.agency/mmm/reset-password.html
وأيضاً لو تستخدم اللوكال:
http://localhost:*/reset-password.html
