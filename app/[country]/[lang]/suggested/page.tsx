import Link from 'next/link';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { getCountryByCode } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function SuggestedPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const activeCountry = await getCountryByCode(country);
  const isAr = lang === 'ar';

  return (
    <main className="container page">
      <section className="lux-hero suggested-page-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="pill">✦ {isAr ? 'فرص ذكية' : 'Smart picks'}</span>
            <h1 className="lux-title">{isAr ? 'فرص مقترحة حسب اهتماماتك وسلوكك.' : 'Recommended opportunities based on your interests.'}</h1>
            <p className="lux-text">{isAr ? 'هذه الصفحة مستقلة وواضحة بدل التحويل لتبويب داخل الداشبورد، وتعرض للمستثمرين أفضل الفرص حسب الميزانية والقطاع والموقع والتفاعل.' : 'A dedicated page for personalized recommendations instead of a hidden dashboard tab.'}</p>
            <div className="hero-actions">
              <Link className="btn btn-gold" href={`/${activeCountry.code}/${lang}/opportunities`}>{isAr ? 'كل الفرص' : 'All opportunities'}</Link>
              <Link className="btn btn-outline" href={`/${activeCountry.code}/${lang}/dashboard?tab=interests`}>{isAr ? 'تعديل اهتماماتي' : 'Edit interests'}</Link>
            </div>
          </div>
        </div>
      </section>
      <SmartRecommendations country={activeCountry.code} lang={lang} />
    </main>
  );
}
