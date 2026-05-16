export const dynamic = 'force-dynamic';
import { PublicChrome } from '@/components/PublicChrome';
import { getCountries, getCountryByCode, getLanguages, getUiTranslations } from '@/lib/server-data';

export default async function CountryLangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const [countries, languages, translations] = await Promise.all([getCountries(), getLanguages(), getUiTranslations(lang)]);
  const activeCountry = await getCountryByCode(country);

  return (
    <PublicChrome country={activeCountry.code} lang={lang} countries={countries} languages={languages} translations={translations}>
      {children}
    </PublicChrome>
  );
}
