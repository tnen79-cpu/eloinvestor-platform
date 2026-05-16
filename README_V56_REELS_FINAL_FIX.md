# v56 Reels Final Fix

## المشكلة
صفحة الريلز كانت تقرأ الفيديوهات من `projects.video_url` أو تستخدم join مباشر بين `project_videos` و `projects`.
في قاعدة البيانات الحالية الفيديوهات محفوظة في جدول `project_videos`، ولا يوجد FK مضمون بين الجدولين، لذلك كان الـ join يفشل وتظهر الصفحة فارغة.

## الحل
- صفحة الريلز الآن تقرأ من `project_videos` مباشرة.
- بعدها تجلب المشاريع المرتبطة باستعلام منفصل.
- إذا لم يكن المشروع مربوطًا، لا يختفي الفيديو.
- دعم روابط:
  - `/om/ar/reels`
  - `/om/en/reels`
  - `/reels`
  - `/ar/reels`
  - `/en/reels`
- إذا كان `video_url` مسارًا داخل bucket وليس رابطًا كاملًا، يتم تحويله لرابط public من bucket `project-videos`.

## ملاحظة
إذا كان bucket `project-videos` غير public، فعّل قراءته للزوار أو استخدم signed URLs لاحقًا.
