'use client';

import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type PromoPackage = {
  id?: string;
  code?: string;
  name_ar?: string;
  name_en?: string;
  price?: number;
  currency?: string;
  duration_days?: number;
  sponsor_weight?: number;
};

export function PromoteProjectButton({ projectId, ownerId, projectTitle, countryCode = 'om', lang = 'ar' }: { projectId: string; ownerId?: string; projectTitle: string; countryCode?: string; lang?: string }) {
  const isAr = lang === 'ar';
  const [canPromote, setCanPromote] = useState(false);
  const [open, setOpen] = useState(false);
  const [packages, setPackages] = useState<PromoPackage[]>([]);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let mounted = true;
    async function init() {
      const { data } = await supabaseBrowser.auth.getUser();
      const uid = data.user?.id || '';
      if (!mounted) return;
      setCanPromote(Boolean(uid && ownerId && uid === ownerId));
      if (uid && ownerId && uid === ownerId) {
        const { data: rows } = await supabaseBrowser
          .from('subscription_packages')
          .select('*')
          .eq('is_active', true)
          .in('package_type', ['promotion', 'owner', 'both'])
          .order('sort_order', { ascending: true });
        if (mounted) setPackages((rows || []) as PromoPackage[]);
      }
    }
    void init();
    return () => { mounted = false; };
  }, [ownerId]);

  if (!canPromote) return null;

  async function promote(pkg?: PromoPackage) {
    setSaving(true);
    setMessage('');
    const days = Number(pkg?.duration_days || 7);
    const weight = Number(pkg?.sponsor_weight || 50);
    const price = Number(pkg?.price || 0);
    const endsAt = new Date(Date.now() + days * 86400000).toISOString();
    const { error } = await supabaseBrowser.from('promotion_requests').insert({
      project_id: projectId,
      owner_auth_id: ownerId,
      package_code: pkg?.code || 'manual_promotion',
      amount: price,
      currency: pkg?.currency || 'OMR',
      status: 'pending',
      placement: 'home_sponsored',
      sponsor_weight: weight,
      starts_at: new Date().toISOString(),
      ends_at: endsAt,
    });
    if (!error) {
      await supabaseBrowser.from('notifications').insert({
        title: 'طلب ترويج مشروع',
        body: `طلب جديد لترويج المشروع: ${projectTitle}`,
        type: 'promotion',
        entity_type: 'project',
        entity_id: projectId,
      }).then(() => null);
    }
    setSaving(false);
    setMessage(error ? error.message : (isAr ? 'تم إرسال طلب الترويج للإدارة.' : 'Promotion request sent to admin.'));
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-6 py-4 font-black text-slate-950">
        <Megaphone size={18} /> {isAr ? 'روّج مشروعك بمقابل مالي' : 'Promote your project'}
      </button>
      {open ? (
        <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-2xl" dir={isAr ? 'rtl' : 'ltr'}>
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="text-2xl font-black text-slate-950">{isAr ? 'ترويج المشروع' : 'Project promotion'}</h3><p className="mt-2 text-sm font-bold text-slate-500">{isAr ? 'اختر باقة الترويج، وسيتم إرسال الطلب للإدارة للمراجعة والتفعيل.' : 'Choose a promotion plan. Admin will review and activate it.'}</p></div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-slate-100 p-2"><X size={18} /></button>
            </div>
            <div className="mt-5 grid gap-3">
              {(packages.length ? packages : [{ code: 'week', name_ar: 'ترويج أسبوعي', name_en: 'Weekly Promotion', price: 5, currency: 'OMR', duration_days: 7, sponsor_weight: 50 }, { code: 'month', name_ar: 'ترويج شهري', name_en: 'Monthly Promotion', price: 15, currency: 'OMR', duration_days: 30, sponsor_weight: 100 }]).map((pkg) => (
                <button disabled={saving} key={pkg.code || pkg.id} type="button" onClick={() => promote(pkg)} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-right font-black text-slate-900 hover:bg-amber-100">
                  <span className="block text-lg">{isAr ? (pkg.name_ar || pkg.name_en || pkg.code) : (pkg.name_en || pkg.name_ar || pkg.code)}</span>
                  <small className="mt-1 block text-slate-600">{pkg.price || 0} {pkg.currency || 'OMR'} · {pkg.duration_days || 7} {isAr ? 'يوم' : 'days'}</small>
                </button>
              ))}
            </div>
            {message ? <p className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm font-black text-emerald-700">{message}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
