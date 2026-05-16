export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import { getUiTranslations } from '@/lib/server-data';
import { i18nText } from '@/lib/i18n';

async function verifyPayment(sessionId: string, paymentId: string) {
  if (!sessionId && !paymentId) return { status: 'missing_payment' };
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const response = await fetch(`${baseUrl}/api/payments/thawani/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, paymentId }),
      cache: 'no-store',
    });
    return await response.json();
  } catch (error: any) {
    return { status: 'verify_failed', error: error?.message };
  }
}

export default async function PaymentSuccessPage({ params, searchParams }: { params: Promise<{ country: string; lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { country, lang } = await params;
  const query = await searchParams;
  const isAr = lang === 'ar';
  const uiTranslations = await getUiTranslations(lang);
  const tr = (key: string, fallback: string) => i18nText(uiTranslations, 'payment', key, lang, fallback);
  const sessionId = String(query.session_id || query.sessionId || '');
  const paymentId = String(query.payment_id || query.paymentId || '');
  const result = await verifyPayment(sessionId, paymentId);
  const paid = result.status === 'paid';
  const activatedType = result?.activation?.type || '';
  const dashboardTab = activatedType === 'package' ? 'packages' : 'promotion';

  return (
    <main className="payment-result-v38">
      <section>
        <span>{paid ? '✅' : '⏳'}</span>
        <h1>{paid ? tr('paid_title', isAr ? 'تم الدفع وتفعيل الخدمة' : 'Payment complete') : tr('received_title', isAr ? 'وصلنا لنتيجة الدفع' : 'Payment received')}</h1>
        <p>{paid ? tr('paid_desc', isAr ? 'تم تأكيد الدفع وتفعيل الخدمة تلقائياً حسب نوع العملية: باقة، ترويج، أو Boost.' : 'Payment was confirmed and the paid service was activated automatically.') : tr('pending_desc', isAr ? 'إذا تم خصم المبلغ ولم تظهر الخدمة، افتح لوحة التحكم أو تواصل مع الإدارة.' : 'If payment was deducted but service is not active, refresh from dashboard or contact admin.')}</p>
        <div>
          <Link href={`/${country}/${lang}/dashboard?tab=${dashboardTab}`}>{tr('go_dashboard', isAr ? 'الذهاب للوحة التحكم' : 'Go to dashboard')}</Link>
          <Link href={`/${country}/${lang}/opportunities`}>{tr('browse_opportunities', isAr ? 'تصفح الفرص' : 'Browse opportunities')}</Link>
        </div>
      </section>
    </main>
  );
}
