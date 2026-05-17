export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { Suspense } from 'react';
import { CompleteProfileForm } from '@/components/CompleteProfileForm';

export default async function CompleteProfilePage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';

  return (
    <main className="platform-page">
      <section className="platform-auth-wrap">
        <div className="platform-auth-card">
          <span className="platform-chip">EloInvestor</span>
          <h1 className="mt-5 text-3xl font-black text-[var(--brand-ink)]">{isAr ? 'أكمل بيانات حسابك' : 'Complete your profile'}</h1>
          <p className="mt-3 leading-7 text-[var(--brand-muted)]">
            {isAr
              ? 'لأول استخدام للمنصة، اختر نوع الحساب واكتب اسمك حتى تظهر بياناتك بشكل احترافي.'
              : 'For your first visit, choose your account type and enter your name so your profile appears professionally.'}
          </p>
          <Suspense fallback={<div className="mt-8 h-48 animate-pulse rounded-3xl bg-slate-100" />}>
            <CompleteProfileForm country={country} lang={lang} />
          </Suspense>
        </div>
      </section>
    </main>
  );
}
