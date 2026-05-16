export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function CompaniesPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { lang } = await params; const isAr = lang === 'ar';
  return <main className="market-page-shell"><section className="market-section-head"><span>{isAr ? 'شركات الاستثمار' : 'Investment companies'}</span><h1>{isAr ? 'شركات وشركاء الاستثمار' : 'Investment companies and partners'}</h1><p>{isAr ? 'صفحة مخصصة للشركات والشركاء الاستثماريين.' : 'A dedicated page for investment companies and partners.'}</p></section></main>;
}
