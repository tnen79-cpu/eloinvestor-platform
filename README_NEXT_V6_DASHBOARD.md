# EloInvestor Next v6 — User Dashboard Real Data

## ما الجديد؟

- لوحة مستخدم حقيقية تقرأ مشاريع المستخدم من Supabase.
- إحصائيات حقيقية: عدد المشاريع، المنشورة، قيد المراجعة، المشاهدات، طلبات التواصل.
- عرض مشاريع المستخدم مع الصور والحالة والموقع والقطاع والسعر.
- بحث داخل مشاريع المستخدم.
- فلترة حسب الحالة.
- Pagination.
- تعديل مشروع من داخل الداشبورد.
- حذف مشروع.
- Empty states و Loading skeleton.
- توافق مع اختلاف أسماء أعمدة قاعدة البيانات قدر الإمكان.

## ملاحظات مهمة

إذا لم تظهر مشاريع المستخدم، تأكد أن جدول `projects` يحتوي على واحد من الأعمدة التالية ويرتبط بـ auth user id:

- owner_auth_id
- user_auth_id
- auth_id
- user_id
- created_by

الكود يبحث في هذه الأعمدة بالتتابع ويتجاهل الأعمدة غير الموجودة.

## صلاحيات Supabase المقترحة

```sql
alter table projects enable row level security;

drop policy if exists "users_can_read_own_projects" on projects;
create policy "users_can_read_own_projects"
on projects for select
to authenticated
using (
  auth.uid() = owner_auth_id
  or auth.uid() = user_auth_id
  or auth.uid() = auth_id
  or auth.uid() = user_id
  or auth.uid() = created_by
);

drop policy if exists "users_can_update_own_projects" on projects;
create policy "users_can_update_own_projects"
on projects for update
to authenticated
using (
  auth.uid() = owner_auth_id
  or auth.uid() = user_auth_id
  or auth.uid() = auth_id
  or auth.uid() = user_id
  or auth.uid() = created_by
)
with check (
  auth.uid() = owner_auth_id
  or auth.uid() = user_auth_id
  or auth.uid() = auth_id
  or auth.uid() = user_id
  or auth.uid() = created_by
);

drop policy if exists "users_can_delete_own_projects" on projects;
create policy "users_can_delete_own_projects"
on projects for delete
to authenticated
using (
  auth.uid() = owner_auth_id
  or auth.uid() = user_auth_id
  or auth.uid() = auth_id
  or auth.uid() = user_id
  or auth.uid() = created_by
);
```

إذا أحد الأعمدة غير موجود عندك، احذف سطره من SQL قبل التشغيل.
