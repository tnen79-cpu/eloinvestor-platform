export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function TermsPage({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params; const isAr = lang === 'ar'; return <main className="market-page-shell"><section className="market-section-head"><span>{isAr ? 'قانوني' : 'Legal'}</span><h1>{isAr ? 'شروط الاستخدام' : 'Terms of use'}</h1><p>{isAr ? 'سيتم تحديث شروط الاستخدام قبل الإطلاق الرسمي.' : 'Terms of use will be finalized before launch.'}</p></section></main>; }
