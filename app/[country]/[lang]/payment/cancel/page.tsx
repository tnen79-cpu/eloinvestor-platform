export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Link from 'next/link';
import { getUiTranslations } from '@/lib/server-data';
import { i18nText } from '@/lib/i18n';

export default async function PaymentCancelPage({ params, searchParams }: { params: Promise<{ country: string; lang: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { country, lang } = await params;
  const query = await searchParams;
  const isAr = lang === 'ar';
  const uiTranslations = await getUiTranslations(lang);
  const tr = (key: string, fallback: string) => i18nText(uiTranslations, 'payment', key, lang, fallback);
  const promotionRequestId = String(query.promotion_request_id || '');

  return (
    <main className="payment-result-v38">
      <section>
        <span>↩️</span>
        <h1>{tr('cancel_title', isAr ? 'لم يكتمل الدفع' : 'Payment was not completed')}</h1>
        <p>{tr('cancel_desc', isAr ? 'طلب الترويج محفوظ كقيد الدفع. يمكنك إعادة المحاولة من صفحة الترويج أو لوحة التحكم.' : 'Your promotion request is saved as pending payment. You can try again anytime.')}</p>
        <div>
          {promotionRequestId ? <Link href={`/${country}/${lang}/dashboard?tab=promotion`}>{tr('promotion_dashboard', isAr ? 'لوحة الترويج' : 'Promotion dashboard')}</Link> : null}
          <Link href={`/${country}/${lang}/opportunities`}>{tr('back_opportunities', isAr ? 'العودة للفرص' : 'Back to opportunities')}</Link>
        </div>
      </section>
    </main>
  );
}
