'use client';

import { useState } from 'react';
import { Loader2, Star, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export function RatingButton({ projectId, reviewedUserId, lang = 'ar' }: { projectId: string; reviewedUserId?: string; lang?: string }) {
  const isAr = lang === 'ar';
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit() {
    setMessage('');
    const { data } = await supabaseBrowser.auth.getUser();
    const user = data.user;
    if (!user) return setMessage(isAr ? 'سجّل الدخول لإرسال تقييم.' : 'Please sign in to submit a rating.');
    setLoading(true);
    const { error } = await supabaseBrowser.from('deal_ratings').insert({
      reviewer_auth_id: user.id,
      reviewed_auth_id: reviewedUserId || null,
      project_id: projectId,
      rating,
      comment: comment.trim(),
      status: 'pending',
    });
    setLoading(false);
    if (error) return setMessage(error.message);
    setMessage(isAr ? 'تم إرسال التقييم للمراجعة.' : 'Rating submitted for review.');
    setComment('');
    setTimeout(() => setOpen(false), 1000);
  }

  return <>
    <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 font-black text-amber-800"><Star size={16} /> {isAr ? 'قيّم التجربة' : 'Rate experience'}</button>
    {open ? <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-3"><div><h3 className="text-2xl font-black text-slate-950">{isAr ? 'تقييم تجربة التواصل' : 'Rate your experience'}</h3><p className="mt-1 text-sm font-bold text-slate-500">{isAr ? 'التقييم يظهر بعد مراجعة الإدارة.' : 'Ratings are published after admin review.'}</p></div><button onClick={() => setOpen(false)} className="rounded-full bg-slate-100 p-2 text-slate-600"><X size={18} /></button></div>
        <div className="mt-5 grid gap-4">
          <div className="flex justify-center gap-2">{[1,2,3,4,5].map((n) => <button key={n} type="button" onClick={() => setRating(n)} className={n <= rating ? 'text-amber-400' : 'text-slate-300'}><Star size={34} fill="currentColor" /></button>)}</div>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 font-bold outline-none focus:border-emerald-500" placeholder={isAr ? 'اكتب تعليقك...' : 'Write your comment...'} />
          {message ? <p className="rounded-2xl bg-slate-50 p-3 text-sm font-black text-slate-700">{message}</p> : null}
          <button type="button" disabled={loading} onClick={submit} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-4 font-black text-white disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{isAr ? 'إرسال التقييم' : 'Submit rating'}</button>
        </div>
      </div>
    </div> : null}
  </>;
}
