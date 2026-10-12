'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';

export function AdvancedSearchControls({ lang, cities = [], sectors = [] }: { lang: string; cities?: string[]; sectors?: Array<{ key: string; nameAr: string; nameEn: string; icon?: string }> }) {
  const router = useRouter();
  const params = useSearchParams();
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(['minPrice','maxPrice','minRoi','verified','premium'].some(key=>params.has(key)));

  const [error,setError]=useState('');
  function update(formData: FormData) {
    setError('');const min=Number(formData.get('minPrice')||0),max=Number(formData.get('maxPrice')||0);if(min<0||max<0||(max>0&&min>max)){setError(isAr?'الحد الأدنى يجب ألا يتجاوز الحد الأعلى.':'Minimum price must not exceed maximum price.');return;}
    const next = new URLSearchParams();
    const opportunityType=params.get('opportunityType');if(opportunityType)next.set('opportunityType',opportunityType);
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
        <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="advanced-toggle"><SlidersHorizontal size={17} /> {isAr ? 'متقدم' : 'Advanced'}</button>
        <button className="advanced-submit">{isAr ? 'تطبيق' : 'Apply'}</button>
      </div>
      {
        <div className="advanced-extra" style={{ display: open ? undefined : 'none' }}>
          <input name="minPrice" type="number" min="0" step="any" defaultValue={params.get('minPrice') || ''} placeholder={isAr ? 'أقل سعر' : 'Min price'} />
          <input name="maxPrice" type="number" min="0" step="any" defaultValue={params.get('maxPrice') || ''} placeholder={isAr ? 'أعلى سعر' : 'Max price'} />
          <input name="minRoi" type="number" min="0" step="any" defaultValue={params.get('minRoi') || ''} placeholder={isAr ? 'أقل عائد %' : 'Min ROI %'} />
          <label><input name="verified" type="checkbox" defaultChecked={params.get('verified') === '1'} /> {isAr ? 'موثق فقط' : 'Verified only'}</label>
          <label><input name="premium" type="checkbox" defaultChecked={params.get('premium') === '1'} /> {isAr ? 'فرص مميزة فقط' : 'Premium only'}</label>
        </div>
      }
      {error&&<p role="alert">{error}</p>}
    </form>
  );
}
