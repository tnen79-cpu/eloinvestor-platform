'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { normalizeComparisonIds } from '@/lib/marketplace-math';
import { GitCompareArrows } from 'lucide-react';

type Props = { projectId: string; country: string; lang: string; compact?: boolean };

function readCompareList() {
  if (typeof window === 'undefined') return [] as string[];
  try { return normalizeComparisonIds(JSON.parse(localStorage.getItem('elo-compare-projects') || '[]')); } catch { return []; }
}

export function CompareProjectButton({ projectId, country, lang, compact = false }: Props) {
  const isAr = lang === 'ar';
  const [selected, setSelected] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = () => { const list = readCompareList(); setSelected(list.includes(projectId)); setCount(list.length); };
    sync(); window.addEventListener('elo:compare',sync); window.addEventListener('storage',sync);
    return () => { window.removeEventListener('elo:compare',sync); window.removeEventListener('storage',sync); };
  }, [projectId]);

  function toggle() {
    const list = readCompareList();
    if (!list.includes(projectId) && list.length >= 4) { alert(isAr ? 'يمكن مقارنة 4 مشاريع كحد أقصى. أزل مشروعًا أولًا.' : 'Compare up to 4 projects. Remove one first.'); return; }
    const next = normalizeComparisonIds(list.includes(projectId) ? list.filter((id: string) => id !== projectId) : [...list, projectId]);
    try { localStorage.setItem('elo-compare-projects', JSON.stringify(next)); } catch { alert(isAr ? 'تعذر حفظ المقارنة في هذا المتصفح.' : 'Comparison storage is unavailable.'); return; }
    window.dispatchEvent(new Event('elo:compare'));
    setSelected(next.includes(projectId));
    setCount(next.length);
  }

  return (
    <div className={compact ? 'inline-flex items-center gap-2' : 'mt-2 flex items-center gap-2'}>
      <button type="button" onClick={toggle} className="inline-flex items-center justify-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-blue-300 hover:text-blue-700">
        <GitCompareArrows size={14} /> {selected ? (isAr ? 'تمت الإضافة' : 'Added') : (isAr ? 'قارن' : 'Compare')}
      </button>
      {count >= 2 ? <Link href={`/${country}/${lang}/compare`} className="text-xs font-black text-blue-700 underline">{isAr ? `عرض المقارنة (${count})` : `Compare (${count})`}</Link> : null}
    </div>
  );
}
