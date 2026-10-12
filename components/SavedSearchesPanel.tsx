'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bell, Loader2, Plus, Trash2 } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type SavedSearch = { id: string; title?: string; country_code?: string; category?: string; city?: string; price_min?: number; price_max?: number; roi_min?: number; is_active?: boolean; created_at?: string };

export function SavedSearchesPanel({ country = 'om', lang = 'ar' }: { country?: string; lang?: string }) {
  const isAr = lang === 'ar';
  const [rows, setRows] = useState<SavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ title: '', category: '', city: '', price_min: '', price_max: '', roi_min: '' });

  async function load() {
    const { data: auth } = await supabaseBrowser.auth.getUser();
    if (!auth.user) return;
    const { data, error } = await supabaseBrowser.from('saved_searches').select('*').eq('user_auth_id', auth.user.id).order('created_at', { ascending: false }).limit(20);
    if (error) throw error;
    setRows((data || []) as any);
  }

  useEffect(() => { void load().catch(e=>setMessage(e.message||'تعذر تحميل البحث المحفوظ')); }, []);

  async function save() {
    if(loading)return;setMessage('');
    const nums=[form.price_min,form.price_max,form.roi_min].map(v=>Number(v||0));if(nums.some(v=>!Number.isFinite(v)||v<0)||(nums[1]>0&&nums[0]>nums[1])){setMessage(isAr?'أدخل حدودًا مالية صحيحة.':'Enter valid financial limits.');return;}
    setLoading(true);
    try {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      if (!auth.user) throw new Error(isAr ? 'سجّل الدخول لحفظ البحث.' : 'Sign in to save searches.');
      const payload = {
        user_auth_id: auth.user.id,
        country_code: country,
        title: form.title || (isAr ? 'بحث محفوظ' : 'Saved search'),
        category: form.category || null,
        city: form.city || null,
        price_min: Number(form.price_min || 0),
        price_max: Number(form.price_max || 0),
        roi_min: Number(form.roi_min || 0),
        is_active: true,
      };
      const { error } = await supabaseBrowser.from('saved_searches').insert(payload);
      if (error) throw error;
      setForm({ title: '', category: '', city: '', price_min: '', price_max: '', roi_min: '' });
      setMessage(isAr ? 'تم حفظ البحث. يمكنك فتحه لاستعراض الفرص المطابقة.' : 'Search saved. Open it to view matching opportunities.');
      await load();
    } catch (error: any) {
      setMessage(error?.message || (isAr ? 'تعذر حفظ البحث.' : 'Could not save search.'));
    } finally { setLoading(false); }
  }

  async function remove(id: string) {
    if(loading)return;setLoading(true);setMessage('');
    try {const {data:auth,error}=await supabaseBrowser.auth.getUser();if(error||!auth.user)throw new Error('Sign-in required');const r=await supabaseBrowser.from('saved_searches').delete().eq('id',id).eq('user_auth_id',auth.user.id).select('id');if(r.error)throw r.error;if(!r.data?.length)throw new Error('Search changed; reload first');await load();}
    catch(e){setMessage((e as any)?.message||'تعذر حذف البحث');}finally{setLoading(false);}
  }
  function searchUrl(row:SavedSearch){const q=new URLSearchParams();if(row.category)q.set('sector',row.category);if(row.city)q.set('city',row.city);if(row.price_min)q.set('minPrice',String(row.price_min));if(row.price_max)q.set('maxPrice',String(row.price_max));if(row.roi_min)q.set('minRoi',String(row.roi_min));return `/${row.country_code||country}/${lang}/opportunities?${q}#results`;}

  return (
    <div className="clean-card">
      <div className="clean-card-head"><div><h2>{isAr ? 'البحث المحفوظ' : 'Saved searches'}</h2><p>{isAr ? 'احفظ الفلاتر وافتح النتائج المطابقة عند الحاجة.' : 'Save filters and reopen matching results when needed.'}</p></div><Bell /></div>
      <div className="grid gap-3 md:grid-cols-3">
        <input className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" placeholder={isAr ? 'اسم البحث' : 'Search name'} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" placeholder={isAr ? 'القطاع' : 'Category'} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" placeholder={isAr ? 'المدينة' : 'City'} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" placeholder={isAr ? 'أقل سعر' : 'Min price'} value={form.price_min} onChange={(e) => setForm({ ...form, price_min: e.target.value })} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" placeholder={isAr ? 'أعلى سعر' : 'Max price'} value={form.price_max} onChange={(e) => setForm({ ...form, price_max: e.target.value })} />
        <input className="rounded-2xl border border-slate-200 px-4 py-3 font-bold" placeholder={isAr ? 'أقل ROI' : 'Min ROI'} value={form.roi_min} onChange={(e) => setForm({ ...form, roi_min: e.target.value })} />
      </div>
      {message ? <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-700">{message}</p> : null}
      <button onClick={save} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 font-black text-white disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} {isAr ? 'حفظ البحث' : 'Save search'}</button>
      <div className="mt-5 grid gap-3">
        {rows.map((row) => <div key={row.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"><div><Link className="underline" href={searchUrl(row)}>{row.title || (isAr ? 'بحث محفوظ' : 'Saved search')}</Link><p className="text-sm font-bold text-slate-500">{[row.category, row.city, row.price_max ? `${row.price_min || 0}-${row.price_max}` : '', row.roi_min ? `ROI +${row.roi_min}%` : ''].filter(Boolean).join(' · ') || (isAr ? 'كل الفرص' : 'All opportunities')}</p></div><button onClick={() => remove(row.id)} className="rounded-full bg-rose-50 p-2 text-rose-600"><Trash2 size={16} /></button></div>)}
      </div>
    </div>
  );
}
