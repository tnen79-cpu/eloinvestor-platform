export const dynamic = 'force-dynamic';
import { PublicChrome } from '@/components/PublicChrome';
import { getCountries, getCountryByCode } from '@/lib/server-data';

export default async function CountryLangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const countries = await getCountries();
  const activeCountry = await getCountryByCode(country);

  return (
    <PublicChrome country={activeCountry.code} lang={lang} countries={countries}>
      {children}
    </PublicChrome>
  );
}
