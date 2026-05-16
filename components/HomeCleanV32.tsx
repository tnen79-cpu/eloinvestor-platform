import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { formatMoneyForCountry, type DbCountry, type UiProject, type UiSector } from '@/lib/server-data';

type Props = {
  country: DbCountry;
  lang: string;
  projects: UiProject[];
  sectors?: UiSector[];
};

function label(isAr: boolean, ar: string, en: string) {
  return isAr ? ar : en;
}

function categoryName(sector: UiSector, isAr: boolean) {
  return isAr ? sector.nameAr : sector.nameEn;
}

export function HomeCleanV32({ country, lang, projects, sectors = [] }: Props) {
  const isAr = lang === 'ar';
  const basePath = `/${country.code}/${lang}`;
  const publishedProjects = projects.filter((project) => !project.status || project.status === 'published').slice(0, 6);
  const verifiedCount = projects.filter((project) => project.verified).length;
  const totalViews = projects.reduce((sum, project) => sum + (project.views || 0), 0);
  const totalContacts = projects.reduce((sum, project) => sum + (project.contacts || 0), 0);
  const activeSectors = sectors.filter((sector) => sector.isActive !== false).slice(0, 6);
  const featuredProject = publishedProjects[0];

  return (
    <main className="home32" dir={isAr ? 'rtl' : 'ltr'}>
      <section className="home32-hero">
        <div className="home32-container home32-hero-grid">
          <div className="home32-copy">
            <span className="home32-eyebrow">{label(isAr, 'منصة استثمارية منظمة', 'Organized investment marketplace')}</span>
            <h1>{label(isAr, 'استثمر أو اعرض مشروعك بسهولة وأمان', 'Invest or list your project safely and easily')}</h1>
            <p>{label(isAr, 'إلو مستثمر يجمع أصحاب المشاريع والمستثمرين في تجربة واضحة تشبه منصات الإعلانات الحديثة، مع بحث سريع وتواصل محمي وبيانات مرتبة.', 'Alo Investor connects project owners with serious investors through a clear marketplace experience, fast search, protected communication, and organized data.')}</p>

            <form className="home32-search" action={`${basePath}/opportunities`}>
              <input name="q" placeholder={label(isAr, 'ابحث عن مشروع أو قطاع', 'Search project or sector')} />
              <select name="type" defaultValue="">
                <option value="">{label(isAr, 'نوع الفرصة', 'Opportunity type')}</option>
                <option value="sale">{label(isAr, 'مشروع للبيع', 'Project for sale')}</option>
                <option value="partnership">{label(isAr, 'شراكة', 'Partnership')}</option>
                <option value="idea">{label(isAr, 'فكرة بمستندات', 'Documented idea')}</option>
              </select>
              <button type="submit">{label(isAr, 'بحث', 'Search')}</button>
            </form>

            <div className="home32-actions">
              <Link href={`${basePath}/opportunities`} className="home32-btn home32-btn-primary">{label(isAr, 'تصفح الفرص', 'Browse opportunities')}</Link>
              <Link href={`${basePath}/add-project`} className="home32-btn home32-btn-secondary">{label(isAr, 'أضف مشروعك', 'List your project')}</Link>
            </div>
          </div>

          <aside className="home32-side-card">
            <div className="home32-side-head">
              <span>{label(isAr, 'أحدث فرصة', 'Latest opportunity')}</span>
              <b>{country.flag} {isAr ? country.nameAr : country.nameEn}</b>
            </div>
            {featuredProject ? (
              <Link href={`${basePath}/project/${encodeURIComponent(featuredProject.id || featuredProject.slug)}`} className="home32-featured">
                <img src={featuredProject.image} alt={isAr ? featuredProject.titleAr : featuredProject.titleEn} />
                <div>
                  <strong>{isAr ? featuredProject.titleAr : featuredProject.titleEn}</strong>
                  <small>{isAr ? featuredProject.cityAr : featuredProject.cityEn}</small>
                  <b>{formatMoneyForCountry(featuredProject.price, country, lang)}</b>
                </div>
              </Link>
            ) : (
              <div className="home32-empty-mini">
                <strong>{label(isAr, 'لا توجد مشاريع منشورة بعد', 'No published projects yet')}</strong>
                <small>{label(isAr, 'ابدأ بإضافة أول مشروع من لوحة التحكم.', 'Start by adding the first project from your dashboard.')}</small>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="home32-container home32-stats" aria-label={label(isAr, 'إحصائيات المنصة', 'Platform stats')}>
        <div><strong>{projects.length}</strong><span>{label(isAr, 'مشروع منشور', 'Published projects')}</span></div>
        <div><strong>{verifiedCount}</strong><span>{label(isAr, 'مشروع موثق', 'Verified projects')}</span></div>
        <div><strong>{totalViews}</strong><span>{label(isAr, 'مشاهدة', 'Views')}</span></div>
        <div><strong>{totalContacts}</strong><span>{label(isAr, 'طلب تواصل', 'Contact requests')}</span></div>
      </section>

      <section className="home32-container home32-section">
        <div className="home32-section-head">
          <div>
            <span>{label(isAr, 'استكشف حسب القطاع', 'Explore by sector')}</span>
            <h2>{label(isAr, 'الفئات الرئيسية', 'Main categories')}</h2>
          </div>
          <Link href={`${basePath}/opportunities`}>{label(isAr, 'عرض الكل', 'View all')}</Link>
        </div>

        {activeSectors.length ? (
          <div className="home32-categories">
            {activeSectors.map((sector) => (
              <Link key={sector.id || sector.key} href={`${basePath}/opportunities?category=${encodeURIComponent(sector.key)}`}>
                <i>{sector.icon || '◼'}</i>
                <strong>{categoryName(sector, isAr)}</strong>
                <span>{sector.projectCount || 0} {label(isAr, 'مشروع', 'projects')}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="home32-empty-box">{label(isAr, 'الفئات ستظهر هنا بعد إضافتها من لوحة الإدارة.', 'Categories will appear here after adding them from the admin panel.')}</div>
        )}
      </section>

      <section className="home32-container home32-section">
        <div className="home32-section-head">
          <div>
            <span>{label(isAr, 'السوق', 'Marketplace')}</span>
            <h2>{label(isAr, 'أحدث المشاريع', 'Latest projects')}</h2>
          </div>
          <Link href={`${basePath}/opportunities`}>{label(isAr, 'كل الفرص', 'All opportunities')}</Link>
        </div>

        {publishedProjects.length ? (
          <div className="home32-projects">
            {publishedProjects.map((project) => <ProjectCard key={project.id || project.slug} project={project} lang={lang} country={country} />)}
          </div>
        ) : (
          <div className="home32-empty-box">
            <strong>{label(isAr, 'لا توجد فرص منشورة حالياً', 'No opportunities published yet')}</strong>
            <Link href={`${basePath}/add-project`}>{label(isAr, 'أضف أول مشروع', 'Add first project')}</Link>
          </div>
        )}
      </section>

      <section className="home32-container home32-cta">
        <div>
          <h2>{label(isAr, 'هل لديك مشروع وتبحث عن مستثمر؟', 'Have a project and need an investor?')}</h2>
          <p>{label(isAr, 'أضف مشروعك بخطوات بسيطة، وبعد المراجعة يظهر للمستثمرين داخل المنصة.', 'List your project in simple steps, and after review it appears to investors on the platform.')}</p>
        </div>
        <Link href={`${basePath}/add-project`} className="home32-btn home32-btn-primary">{label(isAr, 'أضف مشروعك الآن', 'List your project now')}</Link>
      </section>
    </main>
  );
}
