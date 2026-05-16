import Link from 'next/link';
import type { UiAd } from '@/lib/server-data';

type Props = { ads?: UiAd[]; placements?: string[]; className?: string; variant?: 'dark' | 'light' };

export function PublicAdBanners({ ads = [], placements = [], className = '', variant = 'dark' }: Props) {
  const items = ads.filter((ad) => ad.isActive && ad.imageUrl && (!placements.length || placements.includes(ad.placement))).sort((a, b) => (a.sortOrder || 100) - (b.sortOrder || 100));
  if (!items.length) return null;
  return (
    <section className={`public-ad-strip ${variant === 'light' ? 'public-ad-strip-light' : ''} ${className}`.trim()}>
      {items.slice(0, 3).map((ad) => {
        const href = ad.linkUrl || '#';
        const content = <><span>{ad.title}</span>{href && href !== '#' ? <b>↗</b> : null}</>;
        const style = { backgroundImage: `linear-gradient(90deg, rgba(10,15,13,.70), rgba(10,15,13,.10)), url(${ad.imageUrl})` };
        return href && href !== '#' ? (href.startsWith('/') ? <Link key={ad.id || `${ad.title}-${ad.placement}`} href={href} className="public-ad-banner" style={style}>{content}</Link> : <a key={ad.id || `${ad.title}-${ad.placement}`} href={href} className="public-ad-banner" style={style} target="_blank" rel="noreferrer">{content}</a>) : <div key={ad.id || `${ad.title}-${ad.placement}`} className="public-ad-banner" style={style}>{content}</div>;
      })}
    </section>
  );
}
