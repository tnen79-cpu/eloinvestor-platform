import { Header } from '@/components/Header';
import { MobileNav } from '@/components/MobileNav';

export default async function CountryLangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  return (
    <div dir={dir} lang={lang} className="min-h-screen bg-[#f5faf7] pb-20 text-slate-950 md:pb-0">
      <Header country={country} lang={lang} />
      {children}
      <MobileNav country={country} lang={lang} />
    </div>
  );
}
