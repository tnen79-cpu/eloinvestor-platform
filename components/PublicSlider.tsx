import Link from 'next/link';
import type { UiSlide } from '@/lib/server-data';

type Props = { slides?: UiSlide[]; lang: string; enabled?: boolean; className?: string };

export function PublicSlider({ slides = [], lang, enabled = true, className = '' }: Props) {
  const isAr = lang === 'ar';
  const items = enabled ? slides.filter((slide) => slide.isActive && (slide.imageUrl || slide.titleAr || slide.titleEn)).sort((a, b) => (a.slideOrder || 100) - (b.slideOrder || 100)).slice(0, 5) : [];
  if (!items.length) return null;
  return (
    <section className={`public-slider ${className}`.trim()} dir={isAr ? 'rtl' : 'ltr'}>
      <div className="public-slider-track" style={{ ['--slide-count' as any]: String(items.length) }}>
        {items.map((slide) => {
          const title = isAr ? (slide.titleAr || slide.titleEn) : (slide.titleEn || slide.titleAr);
          const subtitle = isAr ? (slide.subtitleAr || slide.subtitleEn) : (slide.subtitleEn || slide.subtitleAr);
          const button = isAr ? (slide.buttonTextAr || slide.buttonTextEn || 'عرض التفاصيل') : (slide.buttonTextEn || slide.buttonTextAr || 'View details');
          const href = slide.buttonUrl || '#';
          return (
            <article key={slide.id || title} className="public-slide" style={{ backgroundImage: slide.imageUrl ? `linear-gradient(90deg, rgba(0,48,33,.82), rgba(0,48,33,.25)), url(${slide.imageUrl})` : undefined }}>
              <div>
                <span>{isAr ? 'إعلان مميز' : 'Featured'}</span>
                <h2>{title}</h2>
                {subtitle ? <p>{subtitle}</p> : null}
                {href.startsWith('/') ? <Link href={href}>{button}</Link> : <a href={href} target={href === '#' ? undefined : '_blank'} rel="noreferrer">{button}</a>}
              </div>
            </article>
          );
        })}
      </div>
      {items.length > 1 ? <div className="public-slider-dots">{items.map((item, index) => <i key={item.id || index} />)}</div> : null}
    </section>
  );
}
