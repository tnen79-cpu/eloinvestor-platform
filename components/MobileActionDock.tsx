'use client';

import Link from 'next/link';
import { MessageCircle, Plus, Search, Sparkles } from 'lucide-react';

export function MobileActionDock({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  return (
    <div className="mobile-action-dock" dir={isAr ? 'rtl' : 'ltr'}>
      <Link href={`/${country}/${lang}/opportunities`}><Search size={18} /><span>{isAr ? 'بحث' : 'Search'}</span></Link>
      <Link href={`/${country}/${lang}/dashboard?tab=suggested`}><Sparkles size={18} /><span>{isAr ? 'مقترحة' : 'For you'}</span></Link>
      <Link className="primary" href={`/${country}/${lang}/add-project`}><Plus size={22} /></Link>
      <Link href={`/${country}/${lang}/dashboard?tab=messages`}><MessageCircle size={18} /><span>{isAr ? 'الشات' : 'Chat'}</span></Link>
    </div>
  );
}
