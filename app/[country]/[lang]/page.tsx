export const dynamic = 'force-dynamic';
import { LandingV16 } from '@/components/LandingV16';
import { getCountryByCode, getHomepageSlides, getPlatformAds, getProjects, isHomepageSliderEnabled, getSectors } from '@/lib/server-data';

export default async function HomePage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const c = await getCountryByCode(country);
  const [currentProjects, slides, ads, sliderEnabled, sectors] = await Promise.all([
    getProjects(c.code),
    getHomepageSlides(c.code),
    getPlatformAds(c.code),
    isHomepageSliderEnabled(),
    getSectors(c.code),
  ]);
  return <LandingV16 country={c} lang={lang} projects={currentProjects} slides={sliderEnabled ? slides : []} ads={ads} sectors={sectors} />;
}
