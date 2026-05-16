export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { Suspense } from 'react';
import { MessagesCenter } from '@/components/MessagesCenter';

export default async function MessagesPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  return (
    <main className="platform-page-wide">
      <section className="platform-hero">
        <span className="platform-eyebrow">{isAr ? 'التواصل المحمي' : 'Protected messaging'}</span>
        <h1 className="platform-title">{isAr ? 'محادثاتك الاستثمارية' : 'Your investment conversations'}</h1>
        <p className="platform-subtitle">{isAr ? 'تابع المحادثات مع المستثمرين وأصحاب المشاريع ضمن تجربة موحدة وآمنة.' : 'Track conversations with investors and project owners in a unified, protected experience.'}</p>
      </section>
      <section className="platform-section platform-card platform-card-pad">
        <Suspense fallback={<div className="font-black text-[var(--brand-muted)]">Loading messages...</div>}>
          <MessagesCenter country={country} lang={lang} />
        </Suspense>
      </section>
    </main>
  );
}
