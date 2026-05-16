import { PromotionClickLink } from '@/components/PromotionClickLink';
import { Crown } from 'lucide-react';
import type { UiProject } from '@/lib/server-data';
import { formatMoneyForCountry, type DbCountry } from '@/lib/server-data';

export function SponsoredProjectsStrip({ projects, country, lang }: { projects: UiProject[]; country: DbCountry; lang: string }) {
  const isAr = lang === 'ar';
  const items = projects.slice(0, 4);
  if (!items.length) return null;
  return (
    <section className="sponsored-strip">
      <div className="sponsored-head"><Crown size={19} /><b>{isAr ? 'فرص ممولة' : 'Sponsored opportunities'}</b><span>{isAr ? 'ظهور مدفوع مع تتبع الحملات' : 'Paid placement with campaign tracking'}</span></div>
      <div className="sponsored-grid">
        {items.map((p) => <PromotionClickLink key={p.id || p.slug} href={`/${country.code}/${lang}/project/${p.slug || p.id}`} projectId={p.id || p.slug} enabled className="sponsored-card"><img src={p.image} alt="" /><div><b>{isAr ? p.titleAr : p.titleEn}</b><span>{formatMoneyForCountry(p.price, country, lang)} · {p.roi}%</span></div><i>{isAr ? 'ممول' : 'Sponsored'}</i></PromotionClickLink>)}
      </div>
    </section>
  );
}
