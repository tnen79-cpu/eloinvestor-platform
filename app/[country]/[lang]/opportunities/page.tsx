export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { AdvancedSearchControls } from '@/components/AdvancedSearchControls';
import { SponsoredProjectsStrip } from '@/components/SponsoredProjectsStrip';
import { PublicAdBanners } from '@/components/PublicAdBanners';
import { PublicSlider } from '@/components/PublicSlider';
import { getDictionary } from '@/lib/data';
import { getCountryByCode, getProjectsAdvanced, getHomepageSlides, getPlatformAds, isHomepageSliderEnabled, getSponsoredProjects, getSectors } from '@/lib/server-data';

export default async function OpportunitiesPage({ params, searchParams }: { params: Promise<{ country: string; lang: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { country, lang } = await params;
  const activeCountry = await getCountryByCode(country);
  const t = getDictionary(lang);
  const rawSearch = searchParams ? await searchParams : {};
  const [list, slides, ads, sliderEnabled, sponsored, sectors] = await Promise.all([getProjectsAdvanced(activeCountry.code, rawSearch), getHomepageSlides(activeCountry.code), getPlatformAds(activeCountry.code), isHomepageSliderEnabled(), getSponsoredProjects(activeCountry.code), getSectors(activeCountry.code)]);
  const isAr = lang === 'ar';
  const cities = Array.from(new Set(list.map((p) => isAr ? p.cityAr : p.cityEn).filter(Boolean))).slice(0, 12);

  return (
    <main className="container page">
      <PublicAdBanners ads={ads} placements={['opportunities_top', 'all_top']} />
      <PublicSlider slides={slides} lang={lang} enabled={sliderEnabled} />
      <section className="lux-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="pill">◆ {isAr ? 'سوق الفرص الاستثمارية' : 'Investment Marketplace'}</span>
            <h1 className="lux-title">{isAr ? 'اكتشف فرصًا مختارة حسب ميزانيتك واهتمامك.' : 'Explore opportunities by budget and interest.'}</h1>
            <p className="lux-text">{isAr ? 'صفحة موحدة مع هوية إلو مستثمر: فلترة دقيقة، كروت فاخرة، درجة مشروع، مؤشرات طلب، ومعلومات تساعد المستثمر على اتخاذ القرار بسرعة.' : 'A premium opportunities page with filters, project score, demand indicators, and clear deal data.'}</p>
            <div className="hero-actions">
              <a className="btn btn-gold" href="#results">{t.explore}</a>
              <Link className="btn btn-outline" href={`/${activeCountry.code}/${lang}/add-project`}>{t.publish}</Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><b>{list.length}</b><span>{isAr ? 'فرصة نشطة' : 'Active'}</span></div>
              <div className="hero-stat"><b>{list.filter(p => p.verified).length}</b><span>{isAr ? 'فرصة موثقة' : 'Verified'}</span></div>
              <div className="hero-stat"><b>{list.filter(p => (p.roi || 0) > 10).length}</b><span>{isAr ? 'فرصة ساخنة' : 'Hot deals'}</span></div>
            </div>
          </div>

          <aside className="hero-panel">
            <h3>{isAr ? 'ابحث بسرعة' : 'Quick search'}</h3>
            <div className="hero-search">
              <input type="search" placeholder={isAr ? 'مثال: مقهى، تطبيق، متجر' : 'Cafe, app, store'} />
              <select><option>{t.allCategories}</option>{sectors.map(c => <option key={c.key} value={c.key}>{isAr ? c.nameAr : c.nameEn}</option>)}</select>
              <select><option>{isAr ? 'كل الميزانيات' : 'All budgets'}</option><option>{isAr ? 'أقل من 10,000 ر.ع' : 'Under 10,000'}</option><option>{isAr ? '10,000 - 50,000 ر.ع' : '10,000 - 50,000'}</option></select>
              <button className="btn btn-gold">{isAr ? 'اعرض النتائج' : 'Show results'}</button>
            </div>
            <div className="hero-tags"><span>{isAr ? 'موثقة' : 'Verified'}</span><span>{isAr ? 'فرص ساخنة' : 'Hot deals'}</span><span>Project Score</span><span>{activeCountry.flag}</span></div>
          </aside>
        </div>
      </section>

      <AdvancedSearchControls lang={lang} cities={cities} sectors={sectors} />
      <SponsoredProjectsStrip projects={sponsored} country={activeCountry} lang={lang} />

      <PublicAdBanners ads={ads} placements={['opportunities_middle', 'all_middle']} variant="light" />

      <section className="market-layout" id="results">
        <aside className="filters-panel">
          <div className="flex items-center justify-between gap-3"><h2 className="m-0 text-[22px] font-black">{isAr ? 'فلترة متقدمة' : 'Advanced filters'}</h2><button className="btn btn-soft !px-3 !py-2">{isAr ? 'مسح' : 'Reset'}</button></div>
          <div className="filter-group"><h3>{isAr ? 'نوع الفرصة' : 'Deal type'}</h3><label className="check"><input type="checkbox" /> {isAr ? 'مشروع للبيع' : 'Project sale'}</label><label className="check"><input type="checkbox" /> {isAr ? 'شراكة' : 'Partnership'}</label><label className="check"><input type="checkbox" /> {isAr ? 'فكرة استثمارية' : 'Idea'}</label></div>
          <div className="filter-group"><h3>{isAr ? 'مستوى الثقة' : 'Trust level'}</h3><label className="check"><input type="checkbox" /> {isAr ? 'موثق' : 'Verified'}</label><label className="check"><input type="checkbox" /> {isAr ? 'فرصة ساخنة' : 'Hot deal'}</label></div>
          <div className="filter-group"><h3>Project Score</h3><label className="check"><input type="checkbox" /> A+</label><label className="check"><input type="checkbox" /> A</label><label className="check"><input type="checkbox" /> B+</label></div>
          <button className="btn btn-gold w-full mt-4">{isAr ? 'تطبيق الفلترة' : 'Apply filters'}</button>
        </aside>

        <div className="results">
          <div className="results-head"><div><h2>{isAr ? 'فرص مميزة' : 'Featured deals'}</h2><span>{isAr ? `تم العثور على ${list.length} فرصة مناسبة` : `${list.length} opportunities found`}</span></div><div className="flex gap-2"><button className="btn btn-light !px-4">▦</button><button className="btn btn-light !px-4">☰</button></div></div>
          {list.length ? <div className="market-grid">{list.map((project) => <ProjectCard key={project.slug} project={project} lang={lang} country={activeCountry} />)}</div> : <EmptyState lang={lang} country={activeCountry.code} />}
        </div>
      </section>
    </main>
  );
}
