import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { PublicSlider } from '@/components/PublicSlider';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { SponsoredProjectsStrip } from '@/components/SponsoredProjectsStrip';
import { formatMoneyForCountry, type DbCountry, type UiAd, type UiProject, type UiSlide, type UiSector } from '@/lib/server-data';

type LandingV16Props = {
  country: DbCountry;
  lang: string;
  projects: UiProject[];
  slides?: UiSlide[];
  ads?: UiAd[];
  sectors?: UiSector[];
};

const fallbackSectors = [
  { icon: '🍽️', ar: 'مطاعم وكافيهات', en: 'Restaurants & Cafes', count: 48 },
  { icon: '💻', ar: 'تقنية وتطبيقات', en: 'Tech & Apps', count: 34 },
  { icon: '🏪', ar: 'تجارة وتجزئة', en: 'Retail & Trading', count: 62 },
  { icon: '🏗️', ar: 'عقارات وضيافة', en: 'Real Estate & Hospitality', count: 29 },
  { icon: '💆', ar: 'تجميل وعناية', en: 'Beauty & Care', count: 41 },
  { icon: '🏭', ar: 'صناعة وإنتاج', en: 'Manufacturing', count: 18 },
  { icon: '🎓', ar: 'تعليم وتدريب', en: 'Education', count: 23 },
  { icon: '🔧', ar: 'خدمات متنوعة', en: 'Services', count: 85 },
];

const testimonials = [
  { avatar: '👨‍💼', nameAr: 'سالم العبري', nameEn: 'Salem Al Abri', roleAr: 'مستثمر · مسقط', roleEn: 'Investor · Muscat', textAr: 'وجدت الفرصة المناسبة خلال أسبوع من التسجيل. المنصة سهّلت التواصل مع صاحب المشروع بشكل احترافي وآمن جداً.', textEn: 'I found a suitable opportunity within a week. The platform made communication professional, direct, and safe.' },
  { avatar: '👩‍🍳', nameAr: 'فاطمة الحارثية', nameEn: 'Fatima Al Harthy', roleAr: 'صاحبة مشروع · صلالة', roleEn: 'Project owner · Salalah', textAr: 'أضفت مشروعي في دقائق وحصلت على طلبات تواصل جادة خلال الأسبوع الأول من مستثمرين حقيقيين.', textEn: 'I listed my project in minutes and received serious investor requests during the first week.' },
  { avatar: '👨‍💻', nameAr: 'أحمد الكندي', nameEn: 'Ahmed Al Kindi', roleAr: 'مؤسس تقني · مسقط', roleEn: 'Tech founder · Muscat', textAr: 'كنت أبحث عن شراكة لمشروعي التقني، وفي إلو مستثمر وجدت الشريك المناسب خلال فترة قصيرة.', textEn: 'I needed a partner for my tech project, and Alo Investor helped me find the right one quickly.' },
];

function projectTitle(project: UiProject, isAr: boolean) {
  return isAr ? project.titleAr : project.titleEn;
}

function projectCity(project: UiProject, isAr: boolean) {
  return isAr ? project.cityAr : project.cityEn;
}

function tickerItems(isAr: boolean, projects: UiProject[]): Array<{ label: string; delta: string; value: string; down?: boolean }> {
  const fallback = [
    { label: isAr ? 'مطاعم مسقط' : 'Muscat Restaurants', delta: '↑ 12.4%', value: '28,000' },
    { label: isAr ? 'تقنية صلالة' : 'Salalah Tech', delta: '↑ 8.1%', value: '45,000' },
    { label: isAr ? 'تجزئة صحار' : 'Sohar Retail', delta: '↓ 2.3%', value: '15,500', down: true },
    { label: isAr ? 'عقارات نزوى' : 'Nizwa Real Estate', delta: '↑ 19.7%', value: '120,000' },
  ];
  const real = projects.slice(0, 8).map((p) => ({
    label: projectTitle(p, isAr) || (isAr ? 'فرصة استثمارية' : 'Investment opportunity'),
    delta: p.roi ? `↑ ${p.roi}%` : '↑ 6.5%',
    value: String(p.price || 0),
  }));
  return (real.length ? real : fallback).concat(real.length ? real : fallback);
}

export function LandingV16({ country, lang, projects, slides = [], ads = [], sectors = [] }: LandingV16Props) {
  const isAr = lang === 'ar';
  const featured = projects.slice(0, 3);
  const totalValue = projects.reduce((sum, project) => sum + (project.price || 0), 0);
  const verifiedCount = projects.filter((project) => project.verified).length;
  const hotCount = projects.filter((project) => (project.roi || 0) >= 10).length;
  const liveProjects = projects.slice(0, 5);
  const activeSlides = slides.filter((slide) => slide.isActive);
  const heroSlide = activeSlides[0];
  const homeTopAds = ads.filter((ad) => ['home_top', 'home_hero'].includes(ad.placement));
  const homeMiddleAds = ads.filter((ad) => ad.placement === 'home_middle');
  const basePath = `/${country.code}/${lang}`;
  const visibleSectors = sectors.length ? sectors : fallbackSectors.map((sector) => ({ key: sector.en.toLowerCase().replace(/[^a-z0-9]+/g, '_'), nameAr: sector.ar, nameEn: sector.en, icon: sector.icon, imageUrl: '', projectCount: sector.count } as UiSector));

  return (
    <main className="v16-page">
      <div className="v16-ticker-wrap" aria-hidden="true">
        <div className="v16-ticker-inner">
          {tickerItems(isAr, projects).map((item, index) => (
            <div className="v16-ticker-item" key={`${item.label}-${index}`}>
              <span className="label">{item.label}</span>
              <span className={item.down ? 'dn' : 'up'}>{item.delta}</span>
              <span>{Number(item.value).toLocaleString(isAr ? 'ar' : 'en')} {country.currency}</span>
            </div>
          ))}
        </div>
      </div>

      <section className="v16-hero">
        <div className="v16-grid-lines" />
        <div className="v16-glow" />
        <div className="v16-glow v16-glow-2" />
        <div className="v16-hero-inner">
          <div className="v16-hero-copy fade-up visible">
            <div className="v16-eyebrow"><span />{isAr ? 'المنصة الاستثمارية الأولى في عُمان' : 'Oman’s premium investment marketplace'}</div>
            <h1>
              {heroSlide ? (isAr ? (heroSlide.titleAr || heroSlide.titleEn) : (heroSlide.titleEn || heroSlide.titleAr)) : (isAr ? <>استثمر بذكاء<br />في <em>مشاريع حقيقية</em><br />موثوقة وآمنة</> : <>Invest smarter<br />in <em>real verified</em><br />opportunities</>)}
            </h1>
            <p>
              {heroSlide ? (isAr ? (heroSlide.subtitleAr || heroSlide.subtitleEn) : (heroSlide.subtitleEn || heroSlide.subtitleAr)) : (isAr ? 'منصة إلو مستثمر تربط أصحاب المشاريع بالمستثمرين الجادين في عُمان والخليج — بشفافية كاملة وتواصل مباشر ومحمي.' : 'Alo Investor connects serious investors with verified project owners across Oman and the Gulf through protected, transparent communication.')}
            </p>
            <div className="v16-hero-cta">
              <Link href={`${basePath}/opportunities`} className="v16-hero-primary">{isAr ? 'تصفح الفرص الاستثمارية ←' : 'Explore opportunities →'}</Link>
              <Link href={`${basePath}/add-project`} className="v16-hero-secondary">{isAr ? 'أضف مشروعك' : 'List your project'}</Link>
            </div>
            <div className="v16-hero-stats">
              <div><strong>{projects.length || 0}+</strong><span>{isAr ? 'فرصة استثمارية' : 'Investment opportunities'}</span></div>
              <div><strong>{verifiedCount}+</strong><span>{isAr ? 'فرصة موثقة' : 'Verified deals'}</span></div>
              <div><strong>{hotCount}+</strong><span>{isAr ? 'فرصة عالية العائد' : 'High ROI deals'}</span></div>
              <div><strong>11</strong><span>{isAr ? 'محافظة عُمانية' : 'Omani governorates'}</span></div>
            </div>
          </div>

          <aside className="v16-live-card">
            <div className="v16-live-head">
              <span>{isAr ? 'أحدث الفرص · مباشر' : 'Latest opportunities · Live'}</span>
              <b>● {isAr ? 'مباشر' : 'Live'}</b>
            </div>
            <div className="v16-live-list">
              {(liveProjects.length ? liveProjects : projects).slice(0, 5).map((project, index) => (
                <Link href={`${basePath}/project/${encodeURIComponent(project.id || project.slug)}`} className="v16-live-row" key={project.id || project.slug || index}>
                  <div className="v16-row-avatar">{['🍽️', '💻', '🏪', '💆', '🏗️'][index] || '↗'}</div>
                  <div><strong>{projectTitle(project, isAr)}</strong><span>{projectCity(project, isAr) || (isAr ? 'عُمان' : 'Oman')}</span></div>
                  <b>{project.price ? Number(project.price).toLocaleString(isAr ? 'ar' : 'en') : '—'}</b>
                  <em>+{project.roi || 9}%</em>
                </Link>
              ))}
            </div>
            <div className="v16-live-foot">
              <span>{isAr ? 'آخر تحديث: الآن' : 'Updated now'}</span>
              <Link href={`${basePath}/opportunities`}>{isAr ? 'عرض كل الفرص ←' : 'View all →'}</Link>
            </div>
          </aside>
        </div>
      </section>

      <PublicSlider slides={activeSlides} lang={lang} />

      <div className="v16-trust-bar">
        <span className="v16-trust-label">{isAr ? 'لماذا إلو' : 'Why Alo'}</span>
        <i />
        <div>
          {[['🔐', isAr ? 'تواصل محمي ومسجّل' : 'Protected communication'], ['✅', isAr ? 'مشاريع موثوقة' : 'Verified projects'], ['📊', isAr ? 'بيانات مالية شفافة' : 'Transparent deal data'], ['🌍', isAr ? 'تغطية 11 محافظة' : '11 governorates'], ['⚡', isAr ? 'تواصل فوري' : 'Instant contact']].map(([icon, label]) => <span key={label}><b>{icon}</b>{label}</span>)}
        </div>
      </div>

      {homeTopAds.length ? <section className="v16-ad-strip">{homeTopAds.slice(0, 2).map((ad) => <a key={ad.id || ad.title} href={ad.linkUrl || '#'} className="v16-ad-banner" style={{ backgroundImage: `linear-gradient(90deg, rgba(10,15,13,.65), rgba(10,15,13,.1)), url(${ad.imageUrl})` }}><span>{ad.title}</span></a>)}</section> : null}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SmartRecommendations country={country.code} lang={lang} />
        <SponsoredProjectsStrip projects={projects.filter((p) => p.isSponsored || p.verified)} country={country} lang={lang} />
      </div>

      <section className="v16-metrics">
        <div className="v16-metrics-inner">
          <div><strong>{projects.length || 340}<span>+</span></strong><p>{isAr ? 'فرصة استثمارية نشطة' : 'Active opportunities'}</p><em>↑ {isAr ? 'هذا الشهر' : 'this month'}</em></div>
          <div><strong>1,200<span>+</span></strong><p>{isAr ? 'مستثمر مسجّل' : 'Registered investors'}</p><em>↑ 142</em></div>
          <div><strong>{totalValue ? Math.max(1, Math.round(totalValue / 100000) / 10) : 4.8}<span>M</span></strong><p>{isAr ? `إجمالي قيمة الفرص (${country.currency})` : `Total listed value (${country.currency})`}</p><em>↑ 12%</em></div>
          <div><strong>98<span>%</span></strong><p>{isAr ? 'معدل رضا المستخدمين' : 'User satisfaction'}</p><em>↑ 5,400+</em></div>
        </div>
      </section>

      <section className="v16-how">
        <div className="v16-section-head">
          <span>{isAr ? 'كيف تعمل المنصة' : 'How it works'}</span>
          <h2>{isAr ? <>ثلاث خطوات للوصول<br />إلى فرصتك المثالية</> : <>Three steps to your<br />ideal opportunity</>}</h2>
        </div>
        <div className="v16-steps">
          {[['01', '📋', isAr ? 'سجّل وأنشئ حسابك' : 'Create your account', isAr ? 'أنشئ حسابك كمستثمر أو صاحب مشروع، وحدد نوع حسابك واهتماماتك الاستثمارية.' : 'Sign up as an investor or project owner and define your investment interests.'], ['02', '🔍', isAr ? 'تصفح وابحث' : 'Explore and filter', isAr ? 'استعرض الفرص المصنّفة حسب القطاع والمنطقة والعائد، واحفظ الفرص المهمة.' : 'Browse opportunities by sector, location, budget, and return.'], ['03', '💬', isAr ? 'تواصل مباشرة وبأمان' : 'Contact safely', isAr ? 'ابدأ محادثة داخلية مباشرة مع صاحب المشروع، وكل تواصل مسجّل ومحمي.' : 'Start a protected internal conversation with the owner.']].map(([num, icon, title, desc]) => (
            <article key={num}><small>{isAr ? `الخطوة ${num}` : `STEP ${num}`}</small><div>{icon}</div><h3>{title}</h3><p>{desc}</p></article>
          ))}
        </div>
      </section>

      <section className="v16-section">
        <div className="v16-section-head">
          <span>{isAr ? 'استكشف حسب القطاع' : 'Explore by sector'}</span>
          <h2>{isAr ? <>كل القطاعات<br />في مكان واحد</> : <>Every sector<br />in one place</>}</h2>
        </div>
        <div className="v16-cats-grid">
          {visibleSectors.map((sector) => <Link href={`${basePath}/opportunities?category=${encodeURIComponent(sector.key)}`} className="v16-cat-card" key={sector.id || sector.key}><i>↗</i>{sector.imageUrl ? <div className="v16-cat-image" style={{ backgroundImage: `url(${sector.imageUrl})` }} /> : <div>{sector.icon || '◇'}</div>}<strong>{isAr ? sector.nameAr : sector.nameEn}</strong><span>{Number(sector.projectCount || 0)} {isAr ? 'فرصة نشطة' : 'active deals'}</span></Link>)}
        </div>
      </section>

      {homeMiddleAds.length ? <section className="v16-ad-strip v16-ad-strip-light">{homeMiddleAds.slice(0, 3).map((ad) => <a key={ad.id || ad.title} href={ad.linkUrl || '#'} className="v16-ad-banner" style={{ backgroundImage: `linear-gradient(90deg, rgba(0,106,72,.72), rgba(0,106,72,.08)), url(${ad.imageUrl})` }}><span>{ad.title}</span></a>)}</section> : null}

      <section className="v16-featured">
        <div className="v16-featured-inner">
          <div className="v16-featured-head">
            <div><span>{isAr ? 'فرص مميزة' : 'Featured opportunities'}</span><h2>{isAr ? <>أبرز الفرص<br />الاستثمارية هذا الأسبوع</> : <>Top investment<br />deals this week</>}</h2></div>
            <Link href={`${basePath}/opportunities`}>{isAr ? 'عرض كل الفرص ←' : 'View all →'}</Link>
          </div>
          {featured.length ? <div className="v16-projects-grid">{featured.map((project) => <ProjectCard key={project.id || project.slug} project={project} lang={lang} country={country} />)}</div> : <div className="v16-empty">{isAr ? 'لا توجد فرص منشورة بعد.' : 'No opportunities yet.'}</div>}
        </div>
      </section>

      <section className="v16-testimonials">
        <div className="v16-featured-inner">
          <div className="v16-section-head"><span>{isAr ? 'آراء المستخدمين' : 'Testimonials'}</span><h2>{isAr ? <>ماذا يقول<br />مجتمعنا</> : <>What our<br />community says</>}</h2></div>
          <div className="v16-test-grid">
            {testimonials.map((t) => <article key={t.nameEn}><strong>“</strong><p>{isAr ? t.textAr : t.textEn}</p><div><span>{t.avatar}</span><div><b>{isAr ? t.nameAr : t.nameEn}</b><small>{isAr ? t.roleAr : t.roleEn}</small><em>★★★★★</em></div></div></article>)}
          </div>
        </div>
      </section>

      <section className="v16-cta-band">
        <div>
          <h2>{isAr ? 'ابدأ رحلتك الاستثمارية اليوم' : 'Start your investment journey today'}</h2>
          <p>{isAr ? 'سواء كنت مستثمراً تبحث عن فرصة حقيقية أو صاحب مشروع يريد التوسع — إلو مستثمر هو المكان الصحيح.' : 'Whether you are an investor looking for a real opportunity or an owner ready to grow, Alo Investor is the right place.'}</p>
          <div><Link href={`${basePath}/opportunities`}>{isAr ? 'تصفح الفرص الاستثمارية' : 'Explore opportunities'}</Link><Link href={`${basePath}/add-project`}>{isAr ? 'أضف مشروعك مجاناً' : 'List your project'}</Link></div>
        </div>
      </section>

      <footer className="v16-footer">
        <div className="v16-footer-top">
          <div>
            <strong>{isAr ? 'إلو مستثمر' : 'Alo Investor'}</strong>
            <p>{isAr ? 'منصة الاستثمار الذكي — تربط أصحاب المشاريع بالمستثمرين الجادين في عُمان والخليج بشفافية وأمان.' : 'A smart investment platform connecting serious investors with project owners across Oman and the Gulf.'}</p>
          </div>
          <nav><h4>{isAr ? 'المنصة' : 'Platform'}</h4><Link href={`${basePath}/opportunities`}>{isAr ? 'الفرص الاستثمارية' : 'Opportunities'}</Link><Link href={`${basePath}/add-project`}>{isAr ? 'أضف مشروعك' : 'List project'}</Link><Link href={`${basePath}/packages`}>{isAr ? 'الباقات والأسعار' : 'Packages'}</Link><Link href={`${basePath}/verification`}>{isAr ? 'التوثيق' : 'Verification'}</Link></nav>
          <nav><h4>{isAr ? 'الحساب' : 'Account'}</h4><Link href={`${basePath}/login`}>{isAr ? 'تسجيل الدخول' : 'Login'}</Link><Link href={`${basePath}/register`}>{isAr ? 'إنشاء حساب' : 'Register'}</Link><Link href={`${basePath}/dashboard`}>{isAr ? 'لوحة التحكم' : 'Dashboard'}</Link><Link href={`${basePath}/messages`}>{isAr ? 'المحادثات' : 'Messages'}</Link></nav>
          <nav><h4>{isAr ? 'قانوني' : 'Legal'}</h4><a href="#">{isAr ? 'سياسة الخصوصية' : 'Privacy policy'}</a><a href="#">{isAr ? 'شروط الاستخدام' : 'Terms'}</a><a href="#">{isAr ? 'سياسة الكوكيز' : 'Cookies'}</a></nav>
        </div>
        <div className="v16-footer-bottom"><span>© 2026 {isAr ? 'إلو مستثمر. جميع الحقوق محفوظة.' : 'Alo Investor. All rights reserved.'}</span><div><a href="#">X</a><a href="#">Instagram</a><a href="#">LinkedIn</a><a href="#">WhatsApp</a></div></div>
      </footer>
    </main>
  );
}
