'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GitCompareArrows, Trash2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type ProjectRow = Record<string, any>;

function titleOf(row: ProjectRow, lang: string) { return lang === 'ar' ? (row.title_ar || row.title || 'مشروع') : (row.title_en || row.title || row.title_ar || 'Project'); }
function money(n: any) { return new Intl.NumberFormat('en-US').format(Number(n || 0)); }

export function CompareProjectsClient({ country, lang }: { country: string; lang: string }) {
  const isAr = lang === 'ar';
  const [ids, setIds] = useState<string[]>([]);
  const [rows, setRows] = useState<ProjectRow[]>([]);

  useEffect(() => {
    let alive = true;
    async function load() {
      const stored = localStorage.getItem('elo-compare-projects') || '[]';
      let list: string[] = [];
      try {
        list = JSON.parse(stored).filter(Boolean).slice(0, 4);
      } catch {
        list = [];
      }
      if (!alive) return;
      setIds(list);
      if (!list.length) {
        setRows([]);
        return;
      }
      const { data, error } = await supabaseBrowser.from('projects').select('*').in('id', list).limit(4);
      if (alive && !error) setRows(data || []);
    }
    void load();
    return () => { alive = false; };
  }, []);

  function clear() { localStorage.removeItem('elo-compare-projects'); setIds([]); setRows([]); }

  return <main className="mx-auto max-w-7xl px-4 py-8" dir={isAr ? 'rtl' : 'ltr'}><section className="rounded-[2rem] bg-white p-6 shadow-sm"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-black text-blue-700"><GitCompareArrows size={16} /> {isAr ? 'مقارنة المشاريع' : 'Project comparison'}</span><h1 className="mt-3 text-3xl font-black text-slate-950">{isAr ? 'قارن الفرص جنباً إلى جنب' : 'Compare opportunities side by side'}</h1></div><button onClick={clear} className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-black text-slate-700"><Trash2 size={16} /> {isAr ? 'مسح المقارنة' : 'Clear'}</button></div>{rows.length >= 2 ? <div className="mt-6 overflow-auto"><table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-sm"><thead><tr className="text-slate-500"><th className="p-3 text-start">{isAr ? 'البند' : 'Field'}</th>{rows.map((row) => <th key={row.id} className="p-3 text-start">{titleOf(row, lang)}</th>)}</tr></thead><tbody>{[['السعر','price'],['العائد السنوي ROI','roi'],['المدينة','city'],['القطاع','category'],['التوثيق','is_verified'],['عدد المهتمين','contacts_count']].map(([label,key]) => <tr key={key}>{<td className="rounded-s-2xl bg-slate-50 p-3 font-black">{label}</td>}{rows.map((row) => <td key={row.id + key} className="bg-slate-50 p-3 font-bold">{key === 'price' ? `${money(row.price || row.project_price || row.asking_price)} ر.ع` : key === 'is_verified' ? (row.is_verified || row.verified ? 'موثق' : 'غير موثق') : key === 'roi' ? `${row.roi || row.profit_percentage || 0}%` : row[key] || '—'}</td>)}</tr>)}</tbody></table></div> : <div className="mt-6 rounded-2xl bg-slate-50 p-6 text-center font-black text-slate-500">{ids.length ? (isAr ? 'اختر مشروعين على الأقل للمقارنة.' : 'Choose at least two projects to compare.') : (isAr ? 'لم تضف مشاريع للمقارنة بعد.' : 'No projects added to compare yet.')} <Link className="text-blue-700 underline" href={`/${country}/${lang}/opportunities`}>{isAr ? 'استعرض الفرص' : 'Browse opportunities'}</Link></div>}</section></main>;
}
