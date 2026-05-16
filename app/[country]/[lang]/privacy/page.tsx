export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) { const { lang } = await params; const isAr = lang === 'ar'; return <main className="market-page-shell"><section className="market-section-head"><span>{isAr ? 'قانوني' : 'Legal'}</span><h1>{isAr ? 'سياسة الخصوصية' : 'Privacy policy'}</h1><p>{isAr ? 'سيتم تحديث سياسة الخصوصية قبل الإطلاق الرسمي.' : 'Privacy policy will be finalized before launch.'}</p></section></main>; }
