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
  const pageSize=18;
  const rawPage=Number(typeof rawSearch.page==='string'?rawSearch.page:1);
  const page=Math.min(Math.max(1,Number.isFinite(rawPage)?Math.floor(rawPage):1),Math.max(1,Math.ceil(list.length/pageSize)));
  const pageRows=list.slice((page-1)*pageSize,page*pageSize);
  const pageUrl=(nextPage:number)=>{const query=new URLSearchParams();Object.entries(rawSearch).forEach(([k,v])=>{if(typeof v==='string'&&k!=='page')query.set(k,v);});query.set('page',String(nextPage));return `/${activeCountry.code}/${lang}/opportunities?${query}#results`;};
  const isMatching = rawSearch.match === '1';
  const matchingBudget = typeof rawSearch.maxPrice === 'string' ? rawSearch.maxPrice : '';
  const matchingSector = typeof rawSearch.sector === 'string' ? rawSearch.sector : 'all';
  const matchingVerified = rawSearch.verified === '1';
  const matchingBase = `/${activeCountry.code}/${lang}/opportunities`;
  const cities = Array.from(new Set([...(typeof rawSearch.city==='string'?[rawSearch.city]:[]),...list.map((p) => isAr ? p.cityAr : p.cityEn).filter(Boolean)])).slice(0, 12);

  return (
    <main className="container page">
      <PublicAdBanners ads={ads} placements={['opportunities_top', 'all_top']} />
      <PublicSlider slides={slides} lang={lang} enabled={sliderEnabled} />
      <section className="lux-hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="pill">◆ {tr('opportunities', 'marketplace', isAr ? 'سوق الفرص الاستثمارية' : 'Investment Marketplace')}</span>
            <h1 className="lux-title">{tr('opportunities', 'title', isAr ? 'اكتشف فرصًا مختارة حسب ميزانيتك واهتمامك.' : 'Explore opportunities by budget and interest.')}</h1>
            <p className="lux-text">{tr('opportunities', 'subtitle', isAr ? 'فلتر الفرص حسب الميزانية والقطاع، وقارن الأرقام واحفظ ملاحظاتك قبل التواصل.' : 'Filter by budget and sector, compare the figures and save your notes before contacting an owner.')}</p>
            <div className="hero-actions">
              <a className="btn btn-gold" href="#results">{t.explore}</a>
              <Link className="btn btn-outline" href={`/${activeCountry.code}/${lang}/add-project`}>{t.publish}</Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat"><b>{list.length}</b><span>{tr('opportunities', 'active', isAr ? 'فرصة نشطة' : 'Active')}</span></div>
              <div className="hero-stat"><b>{list.filter(p => p.verified).length}</b><span>{tr('home', 'verified_count', isAr ? 'فرصة موثقة' : 'Verified')}</span></div>
              <div className="hero-stat"><b>{list.filter(p => p.isSponsored).length}</b><span>{isAr ? 'فرصة ممولة' : 'Sponsored opportunities'}</span></div>
            </div>
          </div>

          <aside className="hero-panel">
            <h3>{tr('opportunities', 'quick_search', isAr ? 'ابحث بسرعة' : 'Quick search')}</h3>
            <form className="hero-search" action={`/${activeCountry.code}/${lang}/opportunities#results`}>
              {['city','minPrice','minRoi','verified','premium','opportunityType','sort'].map(k=>typeof rawSearch[k]==='string'?<input key={k} type="hidden" name={k} value={rawSearch[k] as string}/>:null)}
              <input name="q" type="search" defaultValue={typeof rawSearch.q === 'string' ? rawSearch.q : ''} placeholder={tr('opportunities', 'search_placeholder', isAr ? 'مثال: مقهى، تطبيق، متجر' : 'Cafe, app, store')} />
              <select name="sector" defaultValue={typeof rawSearch.sector === 'string' ? rawSearch.sector : 'all'}><option value="all">{t.allCategories}</option>{sectors.map(c => <option key={c.key} value={c.key}>{isAr ? c.nameAr : c.nameEn}</option>)}</select>
              <select name="maxPrice" defaultValue={typeof rawSearch.maxPrice === 'string' ? rawSearch.maxPrice : '0'}><option value="0">{tr('opportunities', 'all_budgets', isAr ? 'كل الميزانيات' : 'All budgets')}</option><option value="10000">{isAr ? 'أقل من 10,000 ر.ع' : 'Under 10,000'}</option><option value="50000">{isAr ? 'أقل من 50,000 ر.ع' : 'Under 50,000'}</option></select>
              <button className="btn btn-gold" type="submit">{tr('opportunities', 'show_results', isAr ? 'اعرض النتائج' : 'Show results')}</button>
            </form>
            <div className="hero-tags"><span>{isAr ? 'موثقة' : 'Verified'}</span><span>{isAr ? 'فرص ساخنة' : 'Hot deals'}</span><span>{isAr?'مقارنة ومتابعة':'Compare and review'}</span><span>{activeCountry.flag}</span></div>
          </aside>
        </div>
      </section>

      <section className="my-5 rounded-[24px] border border-blue-100 bg-white p-5 shadow-sm md:p-7" aria-labelledby="match-heading">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="text-xs font-bold tracking-wide text-blue-700">{isAr ? 'مساعد اكتشاف الفرص' : 'Opportunity discovery assistant'}</span>
            <h2 id="match-heading" className="mt-1 text-2xl font-black text-slate-900">{isAr ? 'خلّينا نلاقي الفرصة المناسبة لميزانيتك' : 'Find opportunities that fit your budget'}</h2>
            <p className="mt-2 text-sm text-slate-600">{isAr ? 'مطابقة شفافة حسب الميزانية والقطاع والتوثيق، وليست توصية استثمارية أو ضمانًا للعائد.' : 'Transparent matching by budget, sector and verification; not investment advice or guaranteed returns.'}</p>
          </div>
          {isMatching && <Link className="btn btn-outline" href={matchingBase + '#results'}>{isAr ? 'إلغاء المطابقة' : 'Clear matching'}</Link>}
        </div>
        <form action={matchingBase + '#results'} className="grid gap-3 md:grid-cols-[1fr_1fr_auto_auto] md:items-end">
          <input type="hidden" name="match" value="1" />
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {isAr ? 'ميزانيتك القصوى' : 'Maximum budget'}
            <input aria-label={isAr ? 'الميزانية القصوى' : 'Maximum budget'} type="number" name="maxPrice" min="1" step="1" required defaultValue={isMatching ? matchingBudget : ''} placeholder={isAr ? 'مثلاً 25000' : 'e.g. 25000'} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3" />
          </label>
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {isAr ? 'القطاع المفضّل' : 'Preferred sector'}
            <select name="sector" defaultValue={isMatching ? matchingSector : 'all'} className="h-12 w-full rounded-xl border border-slate-200 bg-white px-3">
              <option value="all">{isAr ? 'جميع القطاعات' : 'All sectors'}</option>
              {sectors.map(s => <option key={s.key} value={s.key}>{isAr ? s.nameAr : s.nameEn}</option>)}
            </select>
          </label>
          <label className="flex min-h-12 items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" name="verified" value="1" defaultChecked={isMatching && matchingVerified} className="h-5 w-5 accent-blue-700" />
            {isAr ? 'موثقة فقط' : 'Verified only'}
          </label>
          <button type="submit" className="btn btn-blue min-h-12">{isAr ? 'اعرض الفرص المطابقة' : 'Find matching opportunities'}</button>
        </form>
        {isMatching && <p className="mt-4 text-sm font-bold text-blue-800" role="status">{isAr ? `نتائج المطابقة الحالية: ${list.length} فرصة حسب المعايير المختارة.` : `Current matches: ${list.length} opportunities based on your filters.`}</p>}
      </section>

      <Suspense fallback={<div className="advanced-search-card advanced-search-skeleton"><div className="advanced-main"><span /><span /><span /><span /></div></div>}>
        <AdvancedSearchControls lang={lang} cities={cities} sectors={sectors} />
      </Suspense>
      <SponsoredProjectsStrip projects={sponsored} country={activeCountry} lang={lang} />

      <PublicAdBanners ads={ads} placements={['opportunities_middle', 'all_middle']} variant="light" />

      <section className="market-layout" id="results">
        <form className="filters-panel" action={`/${activeCountry.code}/${lang}/opportunities#results`}>
          {['city','minPrice','maxPrice'].map(k=>typeof rawSearch[k]==='string'?<input key={k} type="hidden" name={k} value={rawSearch[k] as string}/>:null)}
          <input type="hidden" name="q" value={typeof rawSearch.q === 'string' ? rawSearch.q : ''} />
          <input type="hidden" name="sector" value={typeof rawSearch.sector === 'string' ? rawSearch.sector : 'all'} />
          <div className="flex items-center justify-between gap-3"><h2 className="m-0 text-[22px] font-black">{tr('opportunities', 'advanced_filters', isAr ? 'فلترة متقدمة' : 'Advanced filters')}</h2><Link className="btn btn-soft !px-3 !py-2" href={`/${activeCountry.code}/${lang}/opportunities#results`}>{tr('opportunities', 'reset', isAr ? 'مسح' : 'Reset')}</Link></div>
          <div className="filter-group"><h3>{tr('opportunities', 'deal_type', isAr ? 'نوع الفرصة' : 'Deal type')}</h3><label className="check"><input name="opportunityType" value="sale" type="radio" defaultChecked={rawSearch.opportunityType === 'sale'} /> {tr('opportunities', 'project_sale', isAr ? 'مشروع للبيع' : 'Project sale')}</label><label className="check"><input name="opportunityType" value="partnership" type="radio" defaultChecked={rawSearch.opportunityType === 'partnership'} /> {tr('opportunities', 'partnership', isAr ? 'شراكة' : 'Partnership')}</label><label className="check"><input name="opportunityType" value="idea" type="radio" defaultChecked={rawSearch.opportunityType === 'idea'} /> {tr('opportunities', 'idea', isAr ? 'فكرة استثمارية' : 'Idea')}</label></div>
          <div className="filter-group"><h3>{tr('opportunities', 'trust_level', isAr ? 'مستوى الثقة' : 'Trust level')}</h3><label className="check"><input name="verified" value="1" type="checkbox" defaultChecked={rawSearch.verified === '1'} /> {tr('common', 'verified', isAr ? 'موثق' : 'Verified')}</label><label className="check"><input name="premium" value="1" type="checkbox" defaultChecked={rawSearch.premium === '1'} /> {isAr ? 'فرصة ممولة' : 'Sponsored opportunity'}</label></div>
          <div className="filter-group"><h3>{isAr?'العائد والترتيب':'Return and sorting'}</h3><label>{isAr?'أقل عائد سنوي %':'Minimum annual ROI %'}<input name="minRoi" type="number" min="0" step="any" defaultValue={typeof rawSearch.minRoi==='string'?rawSearch.minRoi:''}/></label><label>{isAr?'الترتيب':'Sorting'}<select name="sort" defaultValue={typeof rawSearch.sort==='string'?rawSearch.sort:'smart'}><option value="smart">{isAr?'حسب الملاءمة':'Relevance'}</option><option value="newest">{isAr?'الأحدث':'Newest'}</option><option value="views_desc">{isAr?'الأكثر مشاهدة':'Most viewed'}</option><option value="roi_desc">{isAr?'أعلى عائد':'Highest ROI'}</option><option value="price_asc">{isAr?'الأقل سعرًا':'Lowest price'}</option></select></label></div>
          <button className="btn btn-gold w-full mt-4" type="submit">{tr('opportunities', 'apply_filters', isAr ? 'تطبيق الفلترة' : 'Apply filters')}</button>
        </form>

        <div className="results">
          <div className="results-head"><div><h2>{tr('opportunities', 'featured_deals', isAr ? 'فرص مميزة' : 'Featured deals')}</h2><span>{isAr ? `تم العثور على ${list.length} ${tr('opportunities', 'found_suffix', 'فرصة مناسبة')}` : `${list.length} ${tr('opportunities', 'found_suffix', 'opportunities found')}`}</span></div><nav className="flex flex-wrap gap-2" aria-label={isAr ? "أدوات المستثمر" : "Investor tools"}><Link className="btn btn-light !px-4" href={`/${activeCountry.code}/${lang}/compare`}>{isAr ? "مقارنة الفرص" : "Compare"}</Link><Link className="btn btn-light !px-4" href={`/${activeCountry.code}/${lang}/workspace`}>{isAr ? "مساحة المتابعة" : "My workspace"}</Link></nav></div>
          {list.length ? <div className="market-grid">{pageRows.map((project) => <ProjectCard key={project.slug} project={project} lang={lang} country={activeCountry} />)}</div> : <EmptyState lang={lang} country={activeCountry.code} />}
        </div>
      </section>
      {list.length>pageSize&&<nav aria-label={isAr?'صفحات الفرص':'Opportunity pages'} className="my-6 flex justify-center gap-5">{page>1&&<Link href={pageUrl(page-1)}>{isAr?'السابق':'Previous'}</Link>}<span>{page} / {Math.ceil(list.length/pageSize)}</span>{page<Math.ceil(list.length/pageSize)&&<Link href={pageUrl(page+1)}>{isAr?'التالي':'Next'}</Link>}</nav>}
    </main>
  );
}
