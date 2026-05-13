'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

export function AdvancedSearchControls({ lang, cities = [], sectors = [] }: { lang: string; cities?: string[]; sectors?: Array<{ key: string; nameAr: string; nameEn: string; icon?: string }> }) {
  const router = useRouter();
  const params = useSearchParams();
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(false);

  function update(formData: FormData) {
    const next = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      const v = String(value || '').trim();
      if (v && v !== 'all' && v !== '0') next.set(key, v);
    }
    if (formData.get('verified') === 'on') next.set('verified', '1');
    if (formData.get('premium') === 'on') next.set('premium', '1');
    router.push(`?${next.toString()}#results`);
  }

  return (
    <form action={update} className="advanced-search-card">
      <div className="advanced-main">
        <input name="q" defaultValue={params.get('q') || ''} placeholder={isAr ? 'ابحث: مقهى، تطبيق، متجر...' : 'Search: cafe, app, store...'} />
        <select name="sector" defaultValue={params.get('sector') || 'all'}>
          <option value="all">{isAr ? 'كل القطاعات' : 'All sectors'}</option>
          {sectors.map((cat) => <option key={cat.key} value={cat.key}>{cat.icon ? `${cat.icon} ` : ''}{isAr ? cat.nameAr : cat.nameEn}</option>)}
        </select>
        <select name="city" defaultValue={params.get('city') || 'all'}>
          <option value="all">{isAr ? 'كل المدن' : 'All cities'}</option>
          {cities.map((city) => <option key={city} value={city}>{city}</option>)}
        </select>
        <select name="sort" defaultValue={params.get('sort') || 'smart'}>
          <option value="smart">{isAr ? 'ترتيب ذكي' : 'Smart sorting'}</option>
          <option value="newest">{isAr ? 'الأحدث' : 'Newest'}</option>
          <option value="roi_desc">{isAr ? 'أعلى عائد' : 'Highest ROI'}</option>
          <option value="price_asc">{isAr ? 'الأقل سعرًا' : 'Lowest price'}</option>
          <option value="views_desc">{isAr ? 'الأكثر مشاهدة' : 'Most viewed'}</option>
        </select>
        <button type="button" onClick={() => setOpen((value) => !value)} className="advanced-toggle"><SlidersHorizontal size={17} /> {isAr ? 'متقدم' : 'Advanced'}</button>
        <button className="advanced-submit">{isAr ? 'تطبيق' : 'Apply'}</button>
      </div>
      {open ? (
        <div className="advanced-extra">
          <input name="minPrice" inputMode="numeric" defaultValue={params.get('minPrice') || ''} placeholder={isAr ? 'أقل سعر' : 'Min price'} />
          <input name="maxPrice" inputMode="numeric" defaultValue={params.get('maxPrice') || ''} placeholder={isAr ? 'أعلى سعر' : 'Max price'} />
          <input name="minRoi" inputMode="numeric" defaultValue={params.get('minRoi') || ''} placeholder={isAr ? 'أقل عائد %' : 'Min ROI %'} />
          <label><input name="verified" type="checkbox" defaultChecked={params.get('verified') === '1'} /> {isAr ? 'موثق فقط' : 'Verified only'}</label>
          <label><input name="premium" type="checkbox" defaultChecked={params.get('premium') === '1'} /> {isAr ? 'فرص مميزة فقط' : 'Premium only'}</label>
        </div>
      ) : null}
    </form>
  );
}
