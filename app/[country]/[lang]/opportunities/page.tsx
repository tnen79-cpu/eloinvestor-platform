export const dynamic = 'force-dynamic';
import { Suspense } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/EmptyState';
import { ProjectCard } from '@/components/ProjectCard';
import { AdvancedSearchControls } from '@/components/AdvancedSearchControls';
import { SponsoredProjectsStrip } from '@/components/SponsoredProjectsStrip';
import { PublicAdBanners } from '@/components/PublicAdBanners';
import { PublicSlider } from '@/components/PublicSlider';
import { getDictionary } from '@/lib/data';
import { i18nText } from '@/lib/i18n';
import { getCountryByCode, getProjectsAdvanced, getHomepageSlides, getPlatformAds, isHomepageSliderEnabled, getSponsoredProjects, getSectors, getUiTranslations } from '@/lib/server-data';

export default async function OpportunitiesPage({ params, searchParams }: { params: Promise<{ country: string; lang: string }>; searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const { country, lang } = await params;
  const activeCountry = await getCountryByCode(country);
  const t = getDictionary(lang);
  const rawSearch = searchParams ? await searchParams : {};
  const [list, slides, ads, sliderEnabled, sponsored, sectors, uiTranslations] = await Promise.all([getProjectsAdvanced(activeCountry.code, rawSearch), getHomepageSlides(activeCountry.code), getPlatformAds(activeCountry.code), isHomepageSliderEnabled(), getSponsoredProjects(activeCountry.code), getSectors(activeCountry.code), getUiTranslations(lang)]);
  const tr = (namespace: string, key: string, fallback: string) => i18nText(uiTranslations, namespace, key, lang, fallback);
  const isAr = lang === 'ar';
  const cities = Array.from(new Set(list.map((p) => isAr ? p.cityAr : p.cityEn).filter(Boolean))).slice(0, 12);

  return (
    <main className="container page">
      <PublicAdBanners ads={ads} placements={['opportunities_top', 'all_top']} />
      <PublicSlider slides={slides} lang={lang} enabled={sliderEnabled} />
      <section className="lux-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="pill">◆ {tr('opportunities', 'marketplace', isAr ? 'سوق الفرص الاستثمارية' : 'Investment Marketplace')}</span>
            <h1 className="lux-title">{tr('opportunities', 'title', isAr ? 'اكتشف فرصًا مختارة حسب ميزانيتك واهتمامك.' : 'Explore opportunities by budget and interest.')}</h1>
            <p className="lux-text">{tr('opportunities', 'subtitle', isAr ? 'صفحة موحدة مع هوية إلو مستثمر: فلترة دقيقة، كروت فاخرة، درجة مشروع، مؤشرات طلب، ومعلومات تساعد المستثمر على اتخاذ القرار بسرعة.' : 'A premium opportunities page with filters, project score, demand indicators, and clear deal data.')}</p>
            <div className="hero-actions">
              <a className="btn btn-gold" href="#results">{t.explore}</a>
              <Link className="btn btn-outline" href={`/${activeCountry.code}/${lang}/add-project`}>{t.publish}</Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><b>{list.length}</b><span>{tr('opportunities', 'active', isAr ? 'فرصة نشطة' : 'Active')}</span></div>
              <div className="hero-stat"><b>{list.filter(p => p.verified).length}</b><span>{tr('home', 'verified_count', isAr ? 'فرصة موثقة' : 'Verified')}</span></div>
              <div className="hero-stat"><b>{list.filter(p => (p.roi || 0) > 10).length}</b><span>{tr('opportunities', 'hot_deals', isAr ? 'فرصة ساخنة' : 'Hot deals')}</span></div>
            </div>
          </div>

          <aside className="hero-panel">
            <h3>{tr('opportunities', 'quick_search', isAr ? 'ابحث بسرعة' : 'Quick search')}</h3>
            <form className="hero-search" action={`/${activeCountry.code}/${lang}/opportunities#results`}>
              <input name="q" type="search" defaultValue={typeof rawSearch.q === 'string' ? rawSearch.q : ''} placeholder={tr('opportunities', 'search_placeholder', isAr ? 'مثال: مقهى، تطبيق، متجر' : 'Cafe, app, store')} />
              <select name="sector" defaultValue={typeof rawSearch.sector === 'string' ? rawSearch.sector : 'all'}><option value="all">{t.allCategories}</option>{sectors.map(c => <option key={c.key} value={c.key}>{isAr ? c.nameAr : c.nameEn}</option>)}</select>
              <select name="maxPrice" defaultValue={typeof rawSearch.maxPrice === 'string' ? rawSearch.maxPrice : '0'}><option value="0">{tr('opportunities', 'all_budgets', isAr ? 'كل الميزانيات' : 'All budgets')}</option><option value="10000">{isAr ? 'أقل من 10,000 ر.ع' : 'Under 10,000'}</option><option value="50000">{isAr ? 'أقل من 50,000 ر.ع' : 'Under 50,000'}</option></select>
              <button className="btn btn-gold" type="submit">{tr('opportunities', 'show_results', isAr ? 'اعرض النتائج' : 'Show results')}</button>
            </form>
            <div className="hero-tags"><span>{isAr ? 'موثقة' : 'Verified'}</span><span>{isAr ? 'فرص ساخنة' : 'Hot deals'}</span><span>Project Score</span><span>{activeCountry.flag}</span></div>
          </aside>
        </div>
      </section>

      <Suspense fallback={<div className="advanced-search-card advanced-search-skeleton"><div className="advanced-main"><span /><span /><span /><span /></div></div>}>
        <AdvancedSearchControls lang={lang} cities={cities} sectors={sectors} />
      </Suspense>
      <SponsoredProjectsStrip projects={sponsored} country={activeCountry} lang={lang} />

      <PublicAdBanners ads={ads} placements={['opportunities_middle', 'all_middle']} variant="light" />

      <section className="market-layout" id="results">
        <form className="filters-panel" action={`/${activeCountry.code}/${lang}/opportunities#results`}>
          <input type="hidden" name="q" value={typeof rawSearch.q === 'string' ? rawSearch.q : ''} />
          <input type="hidden" name="sector" value={typeof rawSearch.sector === 'string' ? rawSearch.sector : 'all'} />
          <div className="flex items-center justify-between gap-3"><h2 className="m-0 text-[22px] font-black">{tr('opportunities', 'advanced_filters', isAr ? 'فلترة متقدمة' : 'Advanced filters')}</h2><Link className="btn btn-soft !px-3 !py-2" href={`/${activeCountry.code}/${lang}/opportunities#results`}>{tr('opportunities', 'reset', isAr ? 'مسح' : 'Reset')}</Link></div>
          <div className="filter-group"><h3>{tr('opportunities', 'deal_type', isAr ? 'نوع الفرصة' : 'Deal type')}</h3><label className="check"><input name="opportunityType" value="sale" type="radio" defaultChecked={rawSearch.opportunityType === 'sale'} /> {tr('opportunities', 'project_sale', isAr ? 'مشروع للبيع' : 'Project sale')}</label><label className="check"><input name="opportunityType" value="partnership" type="radio" defaultChecked={rawSearch.opportunityType === 'partnership'} /> {tr('opportunities', 'partnership', isAr ? 'شراكة' : 'Partnership')}</label><label className="check"><input name="opportunityType" value="idea" type="radio" defaultChecked={rawSearch.opportunityType === 'idea'} /> {tr('opportunities', 'idea', isAr ? 'فكرة استثمارية' : 'Idea')}</label></div>
          <div className="filter-group"><h3>{tr('opportunities', 'trust_level', isAr ? 'مستوى الثقة' : 'Trust level')}</h3><label className="check"><input name="verified" value="1" type="checkbox" defaultChecked={rawSearch.verified === '1'} /> {tr('common', 'verified', isAr ? 'موثق' : 'Verified')}</label><label className="check"><input name="premium" value="1" type="checkbox" defaultChecked={rawSearch.premium === '1'} /> {isAr ? 'فرصة ساخنة' : 'Hot deal'}</label></div>
          <div className="filter-group"><h3>Project Score</h3><label className="check"><input name="minRoi" value="20" type="radio" defaultChecked={rawSearch.minRoi === '20'} /> A+ / ROI 20%+</label><label className="check"><input name="minRoi" value="10" type="radio" defaultChecked={rawSearch.minRoi === '10'} /> A / ROI 10%+</label><label className="check"><input name="sort" value="views_desc" type="radio" defaultChecked={rawSearch.sort === 'views_desc'} /> {tr('project', 'views', isAr ? 'الأكثر مشاهدة' : 'Most viewed')}</label></div>
          <button className="btn btn-gold w-full mt-4" type="submit">{tr('opportunities', 'apply_filters', isAr ? 'تطبيق الفلترة' : 'Apply filters')}</button>
        </form>

        <div className="results">
          <div className="results-head"><div><h2>{tr('opportunities', 'featured_deals', isAr ? 'فرص مميزة' : 'Featured deals')}</h2><span>{isAr ? `تم العثور على ${list.length} ${tr('opportunities', 'found_suffix', 'فرصة مناسبة')}` : `${list.length} ${tr('opportunities', 'found_suffix', 'opportunities found')}`}</span></div><div className="flex gap-2"><button className="btn btn-light !px-4">▦</button><button className="btn btn-light !px-4">☰</button></div></div>
          {list.length ? <div className="market-grid">{list.map((project) => <ProjectCard key={project.slug} project={project} lang={lang} country={activeCountry} />)}</div> : <EmptyState lang={lang} country={activeCountry.code} />}
        </div>
      </section>
    </main>
  );
}
