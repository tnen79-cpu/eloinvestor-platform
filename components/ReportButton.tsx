'use client';

import { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Props = {
  targetType: 'project' | 'user' | 'message' | 'conversation';
  targetId: string;
  projectId?: string;
  reportedUserId?: string;
  lang?: string;
  compact?: boolean;
};

export function ReportButton({ targetType, targetId, projectId, reportedUserId, lang = 'ar', compact }: Props) {
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('misleading');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  async function submitReport() {
    setError('');
    const { data } = await supabaseBrowser.auth.getUser();
    const user = data.user;
    if (!user) {
      setError(isAr ? 'سجّل الدخول لإرسال بلاغ.' : 'Please sign in to submit a report.');
      return;
    }
    setLoading(true);
    const { error: insertError } = await supabaseBrowser.from('reports').insert({
      reporter_auth_id: user.id,
      target_type: targetType,
      target_id: targetId,
      project_id: projectId || (targetType === 'project' ? targetId : null),
      reported_user_auth_id: reportedUserId || null,
      reason,
      description: description.trim(),
      status: 'open',
    });
    setLoading(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setDone(true);
    setDescription('');
    setTimeout(() => setOpen(false), 900);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={compact ? 'rounded-full bg-rose-50 px-3 py-2 text-xs font-black text-rose-700' : 'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 font-black text-rose-700'}
      >
        <Flag size={16} /> {isAr ? 'إبلاغ' : 'Report'}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-2xl font-black text-slate-950">{isAr ? 'إرسال بلاغ' : 'Submit a report'}</h3>
                <p className="mt-1 text-sm font-bold text-slate-500">{isAr ? 'سيتم إرسال البلاغ للإدارة للمراجعة.' : 'The admin team will review your report.'}</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600"><X size={18} /></button>
            </div>
            {done ? <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-black text-emerald-700">{isAr ? 'تم إرسال البلاغ بنجاح.' : 'Report submitted successfully.'}</div> : (
              <div className="mt-5 grid gap-3">
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500">
                  <option value="misleading">{isAr ? 'معلومات مضللة' : 'Misleading information'}</option>
                  <option value="fraud">{isAr ? 'اشتباه احتيال' : 'Suspected fraud'}</option>
                  <option value="spam">{isAr ? 'محتوى مزعج' : 'Spam'}</option>
                  <option value="inappropriate">{isAr ? 'محتوى غير مناسب' : 'Inappropriate content'}</option>
                  <option value="other">{isAr ? 'سبب آخر' : 'Other'}</option>
                </select>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-32 rounded-2xl border border-slate-200 bg-white px-4 py-3 font-bold outline-none focus:border-emerald-500" placeholder={isAr ? 'اكتب تفاصيل البلاغ...' : 'Add report details...'} />
                {error ? <p className="rounded-2xl bg-red-50 p-3 text-sm font-black text-red-700">{error}</p> : null}
                <button type="button" onClick={submitReport} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:opacity-60">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{isAr ? 'إرسال البلاغ' : 'Submit report'}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
