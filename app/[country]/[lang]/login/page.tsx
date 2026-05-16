export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import { LoginForm } from '@/components/LoginForm';

export default async function LoginPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  return (
    <main className="platform-page">
      <section className="platform-auth-wrap">
        <div className="platform-auth-card">
          <span className="platform-chip">EloInvestor</span>
          <h1 className="mt-5 text-3xl font-black text-[var(--brand-ink)]">{isAr ? 'تسجيل الدخول' : 'Login'}</h1>
          <p className="mt-3 leading-7 text-[var(--brand-muted)]">{isAr ? 'ادخل لحسابك لإضافة المشاريع ومتابعة الفرص والتواصل.' : 'Access your account to list projects, track opportunities, and connect.'}</p>
          <LoginForm country={country} lang={lang} />
          <p className="mt-5 text-center text-sm font-bold text-[var(--brand-muted)]">
            {isAr ? 'ليس لديك حساب؟' : 'No account?'}{' '}
            <Link className="text-[var(--brand-accent)]" href={`/${country}/${lang}/register`}>{isAr ? 'أنشئ حسابًا' : 'Create account'}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
