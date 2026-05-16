import Link from 'next/link';
import { getSectors } from '@/lib/server-data';

export const dynamic = 'force-dynamic';

export default async function SectorsPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  const sectors = await getSectors(country);
  return (
    <main className="market-page-shell">
      <section className="market-section-head"><span>{isAr ? 'القطاعات' : 'Sectors'}</span><h1>{isAr ? 'استكشف الفرص حسب القطاع' : 'Explore opportunities by sector'}</h1><p>{isAr ? 'اختر قطاعاً للوصول إلى الفرص المناسبة بسرعة.' : 'Pick a sector to find matching opportunities.'}</p></section>
      <section className="market-cats-grid">
        {sectors.map((sector) => <Link key={sector.key} href={`/${country}/${lang}/opportunities?sector=${encodeURIComponent(sector.key)}`} className="market-cat-card"><div>{sector.imageUrl ? <img src={sector.imageUrl} alt={isAr ? sector.nameAr : sector.nameEn} /> : sector.icon}</div><strong>{isAr ? sector.nameAr : sector.nameEn}</strong><small>{sector.projectCount || 0} {isAr ? 'فرصة' : 'opportunities'}</small></Link>)}
        {!sectors.length ? <p className="market-empty-note">{isAr ? 'لا توجد قطاعات مفعلة بعد.' : 'No active sectors yet.'}</p> : null}
      </section>
    </main>
  );
}
