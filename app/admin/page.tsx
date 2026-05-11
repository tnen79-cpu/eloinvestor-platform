export default function AdminPage() {
  return (
    <main className="min-h-screen bg-slate-950 p-8 text-white">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[3rem] bg-white/10 p-8 backdrop-blur">
          <p className="text-sm font-black text-emerald-300">EloInvestor Admin</p>
          <h1 className="mt-2 text-4xl font-black">لوحة الإدارة الجديدة</h1>
          <p className="mt-3 max-w-2xl text-slate-300">هذه صفحة أولية للوحة الإدارة في نسخة Next.js. سيتم ربطها ببيانات Supabase وصلاحيات المشرف في المرحلة القادمة.</p>
        </div>
      </div>
    </main>
  );
}
