'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

function normalizePlanCode(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\u0600-\u06FF]+/g, '_')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

export function PackageSubscribeButton({
  planCode,
  fallbackCode,
  country,
  lang,
  featured = false,
  label,
}: {
  planCode?: string | null;
  fallbackCode?: string | null;
  country: string;
  lang: string;
  featured?: boolean;
  label: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function subscribe() {
    setLoading(true);
    setError('');

    const { data: sessionData } = await supabaseBrowser.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      router.push(`/${country}/${lang}/login?next=/${country}/${lang}/packages`);
      return;
    }

    const code = normalizePlanCode(planCode || fallbackCode || '');
    if (!code) {
      setLoading(false);
      setError(lang === 'ar' ? 'لا يمكن تحديد رمز الباقة.' : 'Plan code is missing.');
      return;
    }

    try {
      const response = await fetch('/api/payments/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ payment_type: 'package', plan_code: code, country, lang }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.paymentUrl) throw new Error(payload.error || (lang === 'ar' ? 'تعذر إنشاء رابط الدفع.' : 'Could not create payment link.'));
      window.location.href = payload.paymentUrl;
    } catch (err: any) {
      setError(err?.message || (lang === 'ar' ? 'حدث خطأ أثناء إنشاء الدفع.' : 'Payment failed.'));
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        onClick={subscribe}
        disabled={loading}
        className={`flex w-full items-center justify-center rounded-2xl px-5 py-4 font-black disabled:cursor-not-allowed disabled:opacity-60 ${featured ? 'bg-[var(--brand-accent)] text-white' : 'bg-[var(--brand-accent-light)] text-[var(--brand-accent)]'}`}
      >
        {loading ? (lang === 'ar' ? 'جاري التحويل للدفع...' : 'Redirecting to payment...') : label}
      </button>
      {error ? <p className="mt-3 rounded-2xl bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</p> : null}
    </div>
  );
}
