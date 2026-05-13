# EloInvestor v23 Clean Rebuild

هذه نسخة تنظيف وإعادة تثبيت بعد تراكم أخطاء النسخ السابقة.

## أهم الإصلاحات
- استبدال NotificationCenter بالكامل بنسخة مستقرة بدون Supabase Realtime crash.
- إلغاء سبب خطأ: cannot add postgres_changes callbacks after subscribe().
- منع تكرار use client داخل نفس الملف.
- SQL legacy-safe لترقية الجداول القديمة بدون حذف بيانات.
- تجهيز أعمدة notifications / analytics / campaigns / recommendations / uploads.
- تثبيت صلاحية super_admin لحساب: na8061104@gmail.com.

## التشغيل
```bash
npm install
npm run dev
```

لو كان هناك سيرفر قديم:
```powershell
taskkill /F /IM node.exe
Remove-Item -Recurse -Force .next
npm run dev
```

## SQL
شغّل الملف:
`SUPABASE_V23_CLEAN_REBUILD_LEGACY_SAFE.sql`
