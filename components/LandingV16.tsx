import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { PublicSlider } from '@/components/PublicSlider';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { SponsoredProjectsStrip } from '@/components/SponsoredProjectsStrip';
import { formatMoneyForCountry, type DbCountry, type UiAd, type UiProject, type UiSlide, type UiSector, type UiTranslations } from '@/lib/server-data';
import { i18nText } from '@/lib/i18n';

type LandingV16Props = {
  country: DbCountry;
  lang: string;
  projects: UiProject[];
  slides?: UiSlide[];
  ads?: UiAd[];
  sectors?: UiSector[];
  translations?: UiTranslations;
};

const fallbackSectors = [
  { icon: '🍽️', ar: 'مطاعم وكافيهات', en: 'Restaurants & Cafes', key: 'restaurants' },
  { icon: '💻', ar: 'تقنية وتطبيقات', en: 'Tech & Apps', key: 'tech' },
  { icon: '🏪', ar: 'تجارة وتجزئة', en: 'Retail & Trading', key: 'retail' },
  { icon: '🏗️', ar: 'عقارات وضيافة', en: 'Real Estate', key: 'real_estate' },
  { icon: '💆', ar: 'تجميل وعناية', en: 'Beauty & Care', key: 'beauty' },
  { icon: '🎓', ar: 'تعليم وتدريب', en: 'Education', key: 'education' },
  { icon: '🔧', ar: 'خدمات متنوعة', en: 'Services', key: 'services' },
  { icon: '🏭', ar: 'صناعة وإنتاج', en: 'Manufacturing', key: 'manufacturing' },
];

function titleOf(project: UiProject, isAr: boolean) {
  return isAr ? project.titleAr : project.titleEn;
}

function cityOf(project: UiProject, isAr: boolean) {
  return isAr ? project.cityAr : project.cityEn;
}

function sectorName(sector: UiSector, isAr: boolean) {
  return isAr ? sector.nameAr : sector.nameEn;
}

export function LandingV16({ country, lang, projects, slides = [], ads = [], sectors = [], translations = {} }: LandingV16Props) {
  const isAr = lang === 'ar';
  const basePath = `/${country.code}/${lang}`;
  const t = (namespace: string, key: string, fallback = '') => i18nText(translations, namespace, key, lang, fallback);
  const activeSlides = slides.filter((slide) => slide.isActive);
  const featured = projects.filter((p) => p.status !== 'rejected').slice(0, 6);
  const verifiedCount = projects.filter((p) => p.verified).length;
  const sponsoredCount = projects.filter((p) => p.isSponsored).length;
  const totalValue = projects.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const visibleSectors: UiSector[] = sectors.length
    ? sectors
    : fallbackSectors.map((s) => ({ id: s.key, key: s.key, nameAr: s.ar, nameEn: s.en, icon: s.icon, imageUrl: '', countryCode: country.code, isActive: true, sortOrder: 1, projectCount: 0 }));
  const heroSlide = activeSlides[0];
  const cityOptions = Array.from(
    new Map(
      projects
        .map((project) => {
          const label = cityOf(project, isAr);
          const value = project.cityEn || project.cityAr || label;
          return label ? [String(value), String(label)] as const : null;
        })
        .filter(Boolean) as Array<readonly [string, string]>
    ).entries()
  ).slice(0, 14);

  return (
    <main className="market-home" dir={isAr ? 'rtl' : 'ltr'}>
      <nav className="mh-cat-bar" aria-label={isAr ? 'القطاعات' : 'Sectors'}>
        <div className="mh-cat-bar-inner">
          <Link className="mh-cat-tab active" href={`${basePath}/opportunities`}>{t('home', 'all')}</Link>
          {visibleSectors.slice(0, 8).map((sector) => (
            <Link className="mh-cat-tab" key={sector.id || sector.key} href={`${basePath}/opportunities?sector=${encodeURIComponent(sector.key)}`}>
              <span>{sector.icon || '◇'}</span>{sectorName(sector, isAr)}
            </Link>
          ))}
        </div>
      </nav>

      <section className="mh-hero">
        <div className="mh-hero-inner">
          <div className="mh-hero-copy">
            <h1>{heroSlide ? (isAr ? heroSlide.titleAr || heroSlide.titleEn : heroSlide.titleEn || heroSlide.titleAr) : <>{t('home', 'hero_title')}</>}</h1>
            <p>{heroSlide ? (isAr ? heroSlide.subtitleAr || heroSlide.subtitleEn : heroSlide.subtitleEn || heroSlide.subtitleAr) : t('home', 'hero_subtitle')}</p>
            <div className="mh-hero-btns">
              <Link className="mh-btn-white" href={`${basePath}/opportunities`}>{t('home', 'explore')}</Link>
              <Link className="mh-btn-glass" href={`${basePath}/add-project`}>{t('home', 'list_project')}</Link>
            </div>
            <div className="mh-hero-stats">
              <div><strong>{projects.length || '--'}</strong><span>{t('home', 'opportunities_count')}</span></div>
              <div><strong>{verifiedCount || '--'}</strong><span>{t('home', 'verified_count')}</span></div>
              <div><strong>{sponsoredCount || '--'}</strong><span>{t('home', 'sponsored_count')}</span></div>
              <div><strong>11</strong><span>{t('home', 'governorates')}</span></div>
            </div>
          </div>

          <aside className="mh-hero-search-panel">
            <div className="mh-hero-search-head">
              <span>{isAr ? 'ابحث عن فرصة مناسبة' : 'Find the right opportunity'}</span>
              <b>{isAr ? 'فلترة ذكية' : 'Smart filters'}</b>
            </div>
            <form className="mh-hero-search-form" action={`${basePath}/opportunities`} method="get">
              <label className="mh-search-field mh-search-field-wide">
                <span>{isAr ? 'ماذا تبحث؟' : 'Search'}</span>
                <input name="q" type="search" placeholder={isAr ? 'مطعم، متجر، تطبيق، مشروع قائم...' : 'Restaurant, shop, app, active business...'} />
              </label>

              <label className="mh-search-field">
                <span>{isAr ? 'المدينة' : 'City'}</span>
                <select name="city" defaultValue="">
                  <option value="">{isAr ? 'كل المدن' : 'All cities'}</option>
                  {cityOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}
                </select>
              </label>

              <label className="mh-search-field">
                <span>{isAr ? 'القطاع' : 'Sector'}</span>
                <select name="sector" defaultValue="">
                  <option value="">{isAr ? 'كل القطاعات' : 'All sectors'}</option>
                  {visibleSectors.map((sector) => (
                    <option value={sector.key} key={sector.id || sector.key}>{sectorName(sector, isAr)}</option>
                  ))}
                </select>
              </label>

              <label className="mh-search-field">
                <span>{isAr ? 'نوع الفرصة' : 'Type'}</span>
                <select name="type" defaultValue="">
                  <option value="">{isAr ? 'كل الأنواع' : 'All types'}</option>
                  <option value="sale">{isAr ? 'بيع مشروع' : 'Business sale'}</option>
                  <option value="partnership">{isAr ? 'شراكة' : 'Partnership'}</option>
                  <option value="funding">{isAr ? 'تمويل' : 'Funding'}</option>
                  <option value="franchise">{isAr ? 'امتياز' : 'Franchise'}</option>
                </select>
              </label>

              <label className="mh-search-field">
                <span>{isAr ? 'الميزانية حتى' : 'Budget up to'}</span>
                <input name="max_price" inputMode="numeric" pattern="[0-9]*" placeholder={country.currency || 'OMR'} />
              </label>

              <button className="mh-hero-search-submit" type="submit">
                {isAr ? 'بحث وفلترة' : 'Search'}
              </button>
              <Link className="mh-hero-search-link" href={`${basePath}/opportunities`}>{isAr ? 'عرض كل الفرص' : 'View all opportunities'}</Link>
            </form>
          </aside>
        </div>
      </section>

      <section className="mh-trust-bar">
        {[
          ['🔐', isAr ? 'تواصل محمي' : 'Protected contact'],
          ['✅', isAr ? 'مشاريع موثوقة' : 'Verified projects'],
          ['📊', isAr ? 'بيانات شفافة' : 'Transparent data'],
          ['🌍', isAr ? '11 محافظة' : '11 governorates'],
          ['⚡', isAr ? 'تواصل فوري' : 'Instant contact'],
        ].map(([icon, text]) => <div className="mh-trust-item" key={text}><span>{icon}</span>{text}</div>)}
      </section>

      <PublicSlider slides={activeSlides} lang={lang} />

      <section className="mh-section">
        <div className="mh-sec-head"><h2>{t('home', 'browse_sector')}</h2><Link href={`${basePath}/opportunities`}>{t('home', 'view_all')}</Link></div>
        <div className="mh-cats-grid">
          {visibleSectors.map((sector) => (
            <Link href={`${basePath}/opportunities?sector=${encodeURIComponent(sector.key)}`} className="mh-cat-card" key={sector.id || sector.key}>
              {sector.imageUrl ? <div className="mh-cat-image" style={{ backgroundImage: `url(${sector.imageUrl})` }} /> : <div className="mh-cat-icon">{sector.icon || '◇'}</div>}
              <strong>{sectorName(sector, isAr)}</strong>
              <span>{Number(sector.projectCount || 0) ? `${sector.projectCount} ${isAr ? 'فرصة نشطة' : 'active deals'}` : (isAr ? 'فرص متاحة' : 'Available deals')}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mh-section">
        <div className="mh-sec-head"><h2>{t('home', 'featured')}</h2><Link href={`${basePath}/opportunities`}>{isAr ? 'عرض كل الفرص ←' : 'All opportunities →'}</Link></div>
        {featured.length ? <div className="mh-cards-grid">{featured.slice(0, 3).map((project) => <ProjectCard key={project.id || project.slug} project={project} lang={lang} country={country} />)}</div> : <div className="mh-empty">{isAr ? 'لا توجد فرص منشورة بعد.' : 'No opportunities have been published yet.'}</div>}
      </section>

      <div className="mh-reco-wrap">
        <SmartRecommendations country={country.code} lang={lang} />
        <SponsoredProjectsStrip projects={featured.filter((p) => p.isSponsored)} country={country} lang={lang} />
      </div>

      <section className="mh-metrics-band">
        <div className="mh-metrics-inner">
          <div><strong>{projects.length || '--'}<span>+</span></strong><p>{isAr ? 'فرصة استثمارية نشطة' : 'Active opportunities'}</p><em>{isAr ? 'من قاعدة البيانات' : 'From database'}</em></div>
          <div><strong>{verifiedCount || '--'}<span>+</span></strong><p>{isAr ? 'فرصة موثوقة' : 'Verified deals'}</p><em>{isAr ? 'تحديث مباشر' : 'Live data'}</em></div>
          <div><strong>{totalValue ? Math.round(totalValue / 1000) : '--'}<span>K</span></strong><p>{isAr ? `إجمالي قيمة الفرص (${country.currency})` : `Total value (${country.currency})`}</p><em>{isAr ? 'حسب المشاريع' : 'From projects'}</em></div>
          <div><strong>{sponsoredCount || '--'}<span>+</span></strong><p>{isAr ? 'مشاريع مميزة' : 'Sponsored projects'}</p><em>{isAr ? 'قابلة للترويج' : 'Promotable'}</em></div>
        </div>
      </section>

      <section className="mh-how">
        <div className="mh-sec-head mh-centered"><h2>{t('home', 'how_title')}</h2></div>
        <div className="mh-steps">
          {[
            ['01', '📋', isAr ? 'سجّل حسابك' : 'Create an account', isAr ? 'أنشئ حسابك كمستثمر أو صاحب مشروع وحدد اهتماماتك الاستثمارية.' : 'Register as an investor or project owner and set your interests.'],
            ['02', '🔍', isAr ? 'تصفح وابحث' : 'Explore and filter', isAr ? 'استعرض الفرص المصنّفة حسب القطاع والمنطقة والعائد واحفظ المفضلة.' : 'Browse opportunities by sector, area, and return.'],
            ['03', '💬', isAr ? 'تواصل بأمان' : 'Contact safely', isAr ? 'ابدأ محادثة داخلية مع صاحب المشروع — كل تواصل مسجّل ومحمي.' : 'Start a protected internal conversation with the project owner.'],
          ].map(([num, icon, heading, desc]) => <article key={num}><span>{isAr ? `الخطوة ${num}` : `STEP ${num}`}</span><div>{icon}</div><h3>{heading}</h3><p>{desc}</p></article>)}
        </div>
      </section>

      <section className="mh-cta-band"><div><h2>{t('home', 'cta_title')}</h2><p>{t('home', 'cta_desc')}</p><div><Link className="mh-btn-white" href={`${basePath}/opportunities`}>{isAr ? 'تصفح الفرص الاستثمارية' : 'Explore opportunities'}</Link><Link className="mh-btn-glass" href={`${basePath}/add-project`}>{isAr ? 'أضف مشروعك مجانًا' : 'List your project'}</Link></div></div></section>
    </main>
  );
}
