# EloInvestor v37 — Missing Features + Promotion Upsell

## أهم ما تم تنفيذه

### 1. نافذة ترويج مباشرة بعد إضافة المشروع
بعد نجاح إضافة مشروع جديد تظهر نافذة احترافية:
- ✅ تم إضافة مشروعك بنجاح
- 🚀 دعوة لترويج المشروع فورًا
- زر **روّج الآن** يفتح صفحة الترويج للمشروع نفسه
- زر **لاحقًا** يرجع المستخدم للوحة التحكم / مشاريعي

الملف المعدل:
- `components/AddProjectForm.tsx`

---

### 2. تجديد الترويج بنقرة واحدة
داخل تبويب الترويج في لوحة المستخدم أُضيف زر:
- **تجديد بنقرة**

ينشئ طلب ترويج جديد من نفس الطلب السابق عبر RPC:
- `request_promotion_renewal(p_request_id)`

الملفات:
- `components/dashboard/UserDashboardGateCore.tsx`
- `SUPABASE_V37_MISSING_FEATURES_AND_UPSELL.sql`

---

### 3. رسالة ترحيب تلقائية
صاحب المشروع يستطيع حفظ رسالة ترحيب من الملف الشخصي.
عندما يبدأ مستثمر محادثة لأول مرة، تُضاف الرسالة تلقائيًا بعد رسالة المستثمر الأولى.

الملفات:
- `components/dashboard/UserDashboardGateCore.tsx`
- `components/ContactActions.tsx`
- `SUPABASE_V37_MISSING_FEATURES_AND_UPSELL.sql`

---

### 4. تنبيهات البحث المحفوظ تعمل تلقائيًا
أُضيف Trigger على جدول `projects`:
- عند نشر/اعتماد مشروع جديد
- يفحص `saved_searches`
- يرسل إشعارًا للمستثمرين المطابقين

SQL:
- `notify_saved_search_matches_for_project()`
- `trg_notify_saved_search_matches_for_project`

---

### 5. استكمال بنية التجديد والإشعارات
أُضيفت أعمدة:
- `renewed_from`
- `renewal_request_count`
- `last_renewal_requested_at`
- `auto_welcome_message`

---

## ملفات SQL المطلوبة
شغّل بالترتيب:
1. `SUPABASE_V36_FEATURE_SUGGESTIONS.sql` إن لم تكن شغلته سابقًا
2. `SUPABASE_V37_MISSING_FEATURES_AND_UPSELL.sql`

## الفحص
- `npx tsc --noEmit` ✅ نجح
- `npm run build` ✅ نجح في التجميع، ثم طال عند مرحلة TypeScript/جمع البيانات بسبب مهلة البيئة
