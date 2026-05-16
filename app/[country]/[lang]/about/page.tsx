export const dynamic = 'force-dynamic';
export const revalidate = 0;
export default async function AboutPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { lang } = await params; const isAr = lang === 'ar';
  return <main className="market-page-shell"><section className="market-section-head"><span>{isAr ? 'عن المنصة' : 'About'}</span><h1>{isAr ? 'إلو مستثمر' : 'Alo Investor'}</h1><p>{isAr ? 'منصة تربط أصحاب المشاريع بالمستثمرين الجادين بطريقة موثوقة ومنظمة.' : 'A platform connecting project owners with serious investors in a trusted marketplace.'}</p></section></main>;
}
