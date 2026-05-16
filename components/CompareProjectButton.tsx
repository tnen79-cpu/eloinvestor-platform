'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitCompareArrows } from 'lucide-react';

type Props = { projectId: string; country: string; lang: string; compact?: boolean };

function readCompareList() {
  if (typeof window === 'undefined') return [] as string[];
  try { return JSON.parse(localStorage.getItem('elo-compare-projects') || '[]').filter(Boolean); } catch { return []; }
}

export function CompareProjectButton({ projectId, country, lang, compact = false }: Props) {
  const isAr = lang === 'ar';
  const [selected, setSelected] = useState(false);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const list = readCompareList();
    setSelected(list.includes(projectId));
    setCount(list.length);
  }, [projectId]);

  function toggle() {
    const list = readCompareList();
    const next = list.includes(projectId) ? list.filter((id: string) => id !== projectId) : [...list, projectId].slice(-4);
    localStorage.setItem('elo-compare-projects', JSON.stringify(next));
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
