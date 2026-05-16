'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, ShieldCheck } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function NdaAcceptanceGate({ projectId, lang = 'ar' }: { projectId: string; lang?: string }) {
  const isAr = lang === 'ar';
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function load() {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      if (!auth.user) { setLoading(false); return; }
      const { data } = await supabaseBrowser.from('project_nda_acceptances').select('id').eq('project_id', projectId).eq('investor_auth_id', auth.user.id).maybeSingle();
      setAccepted(Boolean(data));
      setLoading(false);
    }
    void load();
  }, [projectId]);

  async function accept() {
    setMessage('');
    setLoading(true);
    try {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      if (!auth.user) throw new Error(isAr ? 'سجّل الدخول لقبول الاتفاقية.' : 'Sign in to accept the NDA.');
      const { error } = await supabaseBrowser.from('project_nda_acceptances').upsert({ project_id: projectId, investor_auth_id: auth.user.id, user_agent: navigator.userAgent }, { onConflict: 'project_id,investor_auth_id' });
      if (error) throw error;
      setAccepted(true);
      setMessage(isAr ? 'تم قبول اتفاقية السرية.' : 'NDA accepted.');
    } catch (error: any) { setMessage(error?.message || (isAr ? 'تعذر قبول الاتفاقية.' : 'Could not accept NDA.')); }
    finally { setLoading(false); }
  }

  if (accepted) return <div className="rounded-2xl bg-blue-50 p-4 text-sm font-black text-blue-800"><ShieldCheck className="inline" size={16} /> {isAr ? 'تم قبول اتفاقية السرية لهذا المشروع.' : 'NDA accepted for this project.'}</div>;

  return <div className="rounded-[1.5rem] border border-amber-100 bg-amber-50 p-5"><h3 className="flex items-center gap-2 font-black text-amber-900"><FileText size={18} /> {isAr ? 'تفاصيل حساسة محمية باتفاقية سرية' : 'Sensitive details protected by NDA'}</h3><p className="mt-2 text-sm font-bold text-amber-800">{isAr ? 'قد يخفي صاحب المشروع بعض المستندات المالية أو تفاصيل الشركاء لحين قبول اتفاقية السرية الرقمية.' : 'The owner may hide sensitive financial or partner details until you accept a digital NDA.'}</p>{message ? <p className="mt-3 text-sm font-black text-slate-700">{message}</p> : null}<button onClick={accept} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60">{loading ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />} {isAr ? 'قبول الاتفاقية' : 'Accept NDA'}</button></div>;
}
