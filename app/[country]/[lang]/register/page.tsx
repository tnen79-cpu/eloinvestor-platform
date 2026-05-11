export default async function RegisterPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const isAr = lang === 'ar';
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <div className="w-full rounded-[3rem] bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-black text-slate-950">{isAr ? 'إنشاء حساب' : 'Create Account'}</h1>
        <div className="mt-8 space-y-4">
          <input className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold" placeholder={isAr ? 'الاسم الكامل' : 'Full name'} />
          <input className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold" placeholder={isAr ? 'البريد الإلكتروني' : 'Email'} />
          <input className="w-full rounded-2xl border border-slate-200 px-5 py-4 font-bold" placeholder={isAr ? 'كلمة المرور' : 'Password'} type="password" />
          <button className="w-full rounded-2xl bg-emerald-700 px-6 py-4 font-black text-white">{isAr ? 'إنشاء الحساب' : 'Register'}</button>
        </div>
      </div>
    </main>
  );
}
