import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-md items-center px-4">
      <div className="w-full rounded-[3rem] bg-white p-8 shadow-sm">
        <p className="mb-3 inline-flex rounded-full bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">EloInvestor</p>
        <h1 className="text-3xl font-black text-slate-950">{isAr ? 'تسجيل الدخول' : 'Login'}</h1>
        <p className="mt-3 leading-7 text-slate-600">{isAr ? 'ادخل لحسابك لإضافة المشاريع ومتابعة الفرص والتواصل.' : 'Access your account to list projects, track opportunities, and connect.'}</p>
        <LoginForm country={country} lang={lang} />
      </div>
    </main>
  );
}
