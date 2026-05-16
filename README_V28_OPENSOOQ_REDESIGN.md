# EloInvestor v28 — OpenSooq-style redesign

## ما تم تنفيذه
- إعادة تصميم عامة بطابع سوق مفتوح / OLX: خلفية فاتحة، كروت بيضاء، فلاتر جانبية، مساحات أخف وأزرار أوضح.
- الحفاظ على كروت المشاريع الأساسية وعدم حذف بياناتها أو وظائفها.
- إعادة تنسيق لوحات تحكم المستخدمين بنفس الأسلوب: سايدبار، إحصائيات، كروت، جداول مشاريع أخف.
- إضافة تبويب جديد لصاحب المشروع: **ترويج المشاريع**.
- داخل تبويب الترويج يمكن اختيار مشروع واختيار باقة ترويج وإرسال طلب للإدارة.
- الطلب يحاول الحفظ في جدول `project_promotion_requests`، وإذا لم يكن موجودًا يحفظ كإشعار `notifications` حتى لا يتعطل النظام.

## جدول اختياري للترويج
يمكن لاحقًا إضافة جدول مخصص:

```sql
create table if not exists project_promotion_requests (
  id uuid primary key default gen_random_uuid(),
  user_auth_id uuid not null,
  project_id uuid,
  promotion_plan text not null,
  status text default 'pending',
  note text,
  created_at timestamptz default now()
);
```

## ملاحظات
- هذا التحديث واجهي + وظيفي آمن، بدون كسر قاعدة البيانات الحالية.
- يفضل بعد الرفع تشغيل:

```bash
npm install
npm run build
```
