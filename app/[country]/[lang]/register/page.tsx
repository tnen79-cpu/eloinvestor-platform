export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import { RegisterForm } from '@/components/RegisterForm';

export default async function RegisterPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  return (
    <main className="platform-page">
      <section className="platform-auth-wrap">
        <div className="platform-auth-card">
          <span className="platform-chip">EloInvestor</span>
          <h1 className="mt-5 text-3xl font-black text-[var(--brand-ink)]">{isAr ? 'إنشاء حساب' : 'Create account'}</h1>
          <p className="mt-3 leading-7 text-[var(--brand-muted)]">{isAr ? 'أنشئ حسابك كصاحب مشروع أو مستثمر وابدأ استخدام المنصة.' : 'Create your account as an owner or investor and start using the platform.'}</p>
          <RegisterForm country={country} lang={lang} />
          <p className="mt-5 text-center text-sm font-bold text-[var(--brand-muted)]">
            {isAr ? 'لديك حساب؟' : 'Already have an account?'}{' '}
            <Link className="text-[var(--brand-accent)]" href={`/${country}/${lang}/login`}>{isAr ? 'تسجيل الدخول' : 'Login'}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
