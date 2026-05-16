export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function InvestorsPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { lang } = await params; const isAr = lang === 'ar';
  return <main className="market-page-shell"><section className="market-section-head"><span>{isAr ? 'المستثمرون' : 'Investors'}</span><h1>{isAr ? 'مجتمع المستثمرين' : 'Investor community'}</h1><p>{isAr ? 'سيتم هنا عرض المستثمرين والملفات العامة بعد تفعيل الظهور العام.' : 'Public investor profiles will appear here once enabled.'}</p></section></main>;
}
