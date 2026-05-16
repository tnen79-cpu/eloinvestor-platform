'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, CreditCard, Loader2, Megaphone } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type Plan = {
  id: string;
  nameAr: string;
  nameEn: string;
  days: number;
  price: number;
  placement: string;
  weight: number;
  features: string[];
};

const defaultPlans: Plan[] = [
  { id: 'boost_24h', nameAr: 'Boost سريع 24 ساعة', nameEn: '24h Quick Boost', days: 1, price: 2, placement: 'top_24h', weight: 120, features: ['رفع مؤقت لأعلى النتائج', 'تجربة بسعر رمزي', 'مناسب للمشاريع الجديدة'] },
  { id: 'boost_7', nameAr: 'ترويج أسبوعي', nameEn: 'Weekly Boost', days: 7, price: 5, placement: 'home_sponsored', weight: 25, features: ['ظهور في الرئيسية', 'شارة ممول', 'أولوية داخل الفرص'] },
  { id: 'boost_30', nameAr: 'ترويج شهري', nameEn: 'Monthly Boost', days: 30, price: 18, placement: 'opportunities_sponsored', weight: 70, features: ['وفّر 30% مقارنة بالأسبوعي', 'ظهور في الرئيسية والفرص', 'تقرير أداء الترويج'] },
  { id: 'boost_90', nameAr: 'ترويج ربع سنوي', nameEn: 'Quarterly Boost', days: 90, price: 45, placement: 'dashboard_sponsored', weight: 100, features: ['أفضل قيمة للظهور الطويل', 'أولوية قصوى', 'تنبيه تجديد قبل الانتهاء'] },
];

export function ProjectPromotionForm({
  country,
  lang,
  projectId,
  projectTitle,
  projectImage,
  ownerId,
}: {
  country: string;
  lang: string;
  projectId: string;
  projectTitle: string;
  projectImage?: string;
  ownerId?: string;
}) {
  const isAr = lang === 'ar';
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState(defaultPlans[2].id);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [payUrl, setPayUrl] = useState('');

  const plan = useMemo(() => defaultPlans.find((item) => item.id === selected) || defaultPlans[2], [selected]);

  useEffect(() => {
    supabaseBrowser.auth.getUser().then(({ data }) => setUserId(data.user?.id || ''));
  }, []);

  const isOwner = Boolean(userId && ownerId && userId === ownerId);

  async function submitPromotion() {
    setMessage('');
    if (!userId) {
      router.push(`/${country}/${lang}/login?next=/${country}/${lang}/promote/${encodeURIComponent(projectId)}`);
      return;
    }
    if (!isOwner) {
      setMessage(isAr ? 'ترويج المشروع متاح لصاحب المشروع فقط.' : 'Promotion is available only to the project owner.');
      return;
    }
    setLoading(true);
    try {
      const startsAt = new Date();
      const endsAt = new Date(Date.now() + plan.days * 24 * 60 * 60 * 1000);
      const payload = {
        project_id: projectId,
        owner_auth_id: userId,
        user_auth_id: userId,
        title: `${plan.nameAr} - ${projectTitle}`,
        plan_key: plan.id,
        placement: plan.placement,
        duration_days: plan.days,
        price: plan.price,
        sponsor_weight: plan.weight,
        status: 'pending_payment',
        auto_renew: false,
        notes,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        country_code: country,
      };
      const { data: inserted, error } = await supabaseBrowser.from('promotion_requests').insert(payload).select('id').single();
      if (error) throw error;

      const { data: sessionData } = await supabaseBrowser.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) throw new Error(isAr ? 'انتهت الجلسة. سجل الدخول مرة أخرى.' : 'Session expired. Please login again.');

      const response = await fetch('/api/payments/thawani/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ promotionRequestId: inserted.id, country, lang }),
      });
      const payment = await response.json().catch(() => ({}));
      if (!response.ok || !payment.paymentUrl) throw new Error(payment.error || (isAr ? 'تعذر إنشاء رابط الدفع.' : 'Could not create payment link.'));
      setPayUrl(payment.paymentUrl);
      setMessage(isAr ? 'تم تجهيز رابط الدفع. سيتم تفعيل الترويج تلقائياً بعد نجاح الدفع.' : 'Payment link is ready. Promotion activates automatically after payment.');
      window.location.href = payment.paymentUrl;
    } catch (error: any) {
      setMessage(error?.message || (isAr ? 'تعذر إرسال طلب الترويج.' : 'Could not submit promotion request.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="promote-shell-v34">
      <div className="promote-hero-v34">
        <span><Megaphone size={18} /> {isAr ? 'ترويج مشروع' : 'Promote project'}</span>
        <h1>{isAr ? 'اختر باقة ترويج مناسبة لمشروعك' : 'Choose a promotion plan for your project'}</h1>
        <p>{isAr ? 'ارفع ظهور مشروعك أمام المستثمرين المهتمين عبر شارة ممول وأولوية في أماكن الظهور.' : 'Boost your project visibility with sponsored badges and prioritized placements.'}</p>
      </div>

      <div className="promote-grid-v34">
        <aside className="promote-project-card-v34">
          {projectImage ? <img src={projectImage} alt={projectTitle} /> : null}
          <b>{projectTitle}</b>
          <small>{isAr ? 'المشروع المراد ترويجه' : 'Project to promote'}</small>
        </aside>

        <div className="promote-plans-v34">
          {defaultPlans.map((item) => (
            <button key={item.id} type="button" onClick={() => setSelected(item.id)} className={selected === item.id ? 'active' : ''}>
              <div>
                <h3>{isAr ? item.nameAr : item.nameEn}</h3>
                <p>{item.days} {isAr ? 'يوم' : 'days'} · {item.placement}</p>
                {item.id === 'boost_30' ? <small>{isAr ? 'وفّر 30% مع الباقة الشهرية' : 'Save 30% with monthly plan'}</small> : null}
                {item.id === 'boost_90' ? <small>{isAr ? 'وفّر أكثر مع الربع سنوي' : 'Best long-term value'}</small> : null}
              </div>
              <strong>{item.price} ر.ع</strong>
              <ul>{item.features.map((feature) => <li key={feature}><CheckCircle2 size={15} /> {feature}</li>)}</ul>
            </button>
          ))}
        </div>

        <div className="promote-checkout-v34">
          <h2>{isAr ? 'ملخص الطلب' : 'Order summary'}</h2>
          <p><span>{isAr ? 'الباقة' : 'Plan'}</span><b>{isAr ? plan.nameAr : plan.nameEn}</b></p>
          <p><span>{isAr ? 'المدة' : 'Duration'}</span><b>{plan.days} {isAr ? 'يوم' : 'days'}</b></p>
          <p><span>{isAr ? 'السعر' : 'Price'}</span><b>{plan.price} ر.ع</b></p>
          <label>
            <span>{isAr ? 'ملاحظة اختيارية للإدارة' : 'Optional note for admin'}</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {message ? <div className="promote-message-v34">{message}</div> : null}
          {payUrl ? <a className="promote-pay-link-v38" href={payUrl}><CreditCard size={18} /> {isAr ? 'متابعة الدفع عبر ثواني' : 'Continue payment with Thawani'}</a> : null}
          <button type="button" onClick={submitPromotion} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={18} /> : <CreditCard size={18} />}
            {isAr ? 'ادفع وفعّل الترويج' : 'Pay and activate promotion'}
          </button>
        </div>
      </div>
    </section>
  );
}
