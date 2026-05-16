import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import type { DbCountry, UiProject, UiSector } from '@/lib/server-data';

export type PageBuilderSection = {
  id?: string;
  pageKey: string;
  sectionType: string;
  titleAr?: string;
  titleEn?: string;
  subtitleAr?: string;
  subtitleEn?: string;
  imageUrl?: string;
  buttonTextAr?: string;
  buttonTextEn?: string;
  buttonUrl?: string;
  settings?: Record<string, any> | null;
  isActive?: boolean;
  sortOrder?: number;
};

type Props = {
  sections: PageBuilderSection[];
  country: DbCountry;
  lang: string;
  projects: UiProject[];
  sectors: UiSector[];
};

function txt(section: PageBuilderSection, lang: string, field: 'title' | 'subtitle' | 'buttonText') {
  const ar = (section as any)[`${field}Ar`];
  const en = (section as any)[`${field}En`];
  return lang === 'ar' ? (ar || en || '') : (en || ar || '');
}

function sectorName(sector: UiSector, isAr: boolean) {
  return isAr ? sector.nameAr : sector.nameEn;
}

function listFromSettings(section: PageBuilderSection, lang: string, keyAr: string, keyEn: string, fallback: string[]) {
  const values = lang === 'ar' ? section.settings?.[keyAr] : section.settings?.[keyEn];
  return Array.isArray(values) && values.length ? values.map(String) : fallback;
}

function sectionStyle(section: PageBuilderSection) {
  const bg = section.settings?.background || section.settings?.bg;
  const color = section.settings?.color;
  const radius = section.settings?.radius;
  const style: Record<string, string> = {};
  if (bg) style.background = String(bg);
  if (color) style.color = String(color);
  if (radius) style.borderRadius = String(radius);
  return style;
}

export function PageBuilderRenderer({ sections, country, lang, projects, sectors }: Props) {
  const isAr = lang === 'ar';
  const basePath = `/${country.code}/${lang}`;
  const activeSections = sections.filter((s) => s.isActive !== false).sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0));

  if (!activeSections.length) return null;

  return (
    <div className="page-builder-renderer" dir={isAr ? 'rtl' : 'ltr'}>
      {activeSections.map((section) => {
        const type = section.sectionType;
        const title = txt(section, lang, 'title');
        const subtitle = txt(section, lang, 'subtitle');
        const buttonText = txt(section, lang, 'buttonText');
        const buttonUrl = section.buttonUrl || basePath;
        const limit = Number(section.settings?.limit || 6);

        if (type === 'hero') {
          return (
            <section key={section.id || type} className="mh-hero pb-section pb-hero">
              <div className="mh-hero-inner">
                <div className="mh-hero-copy">
                  <h1>{title || (isAr ? 'استثمر أو اعرض مشروعك بسهولة' : 'Invest or list your business with ease')}</h1>
                  <p>{subtitle || (isAr ? 'منصة ذكية تجمع أصحاب المشاريع بالمستثمرين.' : 'A smart marketplace connecting entrepreneurs and investors.')}</p>
                  <div className="mh-hero-btns">
                    <Link className="mh-btn-white" href={buttonUrl}>{buttonText || (isAr ? 'ابدأ الآن' : 'Get started')}</Link>
                    <Link className="mh-btn-glass" href={`${basePath}/opportunities`}>{isAr ? 'تصفح الفرص' : 'Explore deals'}</Link>
                  </div>
                </div>
                {section.imageUrl ? <div className="pb-hero-image" style={{ backgroundImage: `url(${section.imageUrl})` }} /> : null}
              </div>
            </section>
          );
        }

        if (type === 'search') {
          return (
            <section key={section.id || type} className="mh-section pb-section">
              <div className="mh-sec-head mh-centered"><h2>{title || (isAr ? 'ابحث عن فرصة مناسبة' : 'Find the right opportunity')}</h2></div>
              <form className="mh-hero-search-form pb-search" action={`${basePath}/opportunities`} method="get">
                <label className="mh-search-field mh-search-field-wide"><span>{isAr ? 'ماذا تبحث؟' : 'Search'}</span><input name="q" type="search" placeholder={isAr ? 'مطعم، متجر، تطبيق...' : 'Restaurant, shop, app...'} /></label>
                <label className="mh-search-field"><span>{isAr ? 'القطاع' : 'Sector'}</span><select name="sector" defaultValue=""><option value="">{isAr ? 'كل القطاعات' : 'All sectors'}</option>{sectors.map((sector) => <option key={sector.id || sector.key} value={sector.key}>{sectorName(sector, isAr)}</option>)}</select></label>
                <button className="mh-hero-search-submit" type="submit">{buttonText || (isAr ? 'بحث' : 'Search')}</button>
              </form>
            </section>
          );
        }

        if (type === 'sectors') {
          return (
            <section key={section.id || type} className="mh-section pb-section">
              <div className="mh-sec-head"><h2>{title || (isAr ? 'تصفح حسب القطاع' : 'Browse by sector')}</h2><Link href={`${basePath}/opportunities`}>{isAr ? 'عرض الكل' : 'View all'}</Link></div>
              <div className="mh-cats-grid">{sectors.slice(0, limit).map((sector) => <Link href={`${basePath}/opportunities?sector=${encodeURIComponent(sector.key)}`} className="mh-cat-card" key={sector.id || sector.key}>{sector.imageUrl ? <div className="mh-cat-image" style={{ backgroundImage: `url(${sector.imageUrl})` }} /> : <div className="mh-cat-icon">{sector.icon || '◇'}</div>}<strong>{sectorName(sector, isAr)}</strong><span>{isAr ? 'فرص متاحة' : 'Available deals'}</span></Link>)}</div>
            </section>
          );
        }

        if (type === 'featured_projects') {
          return (
            <section key={section.id || type} className="mh-section pb-section">
              <div className="mh-sec-head"><h2>{title || (isAr ? 'فرص مميزة' : 'Featured opportunities')}</h2><Link href={`${basePath}/opportunities`}>{isAr ? 'عرض الكل' : 'View all'}</Link></div>
              <div className="mh-cards-grid">{projects.slice(0, limit).map((project) => <ProjectCard key={project.id || project.slug} project={project} lang={lang} country={country} />)}</div>
            </section>
          );
        }

        if (type === 'banner') {
          return (
            <section key={section.id || type} className="mh-section pb-section">
              <div className="pb-banner" style={section.imageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(11,82,191,.92), rgba(37,99,235,.72)), url(${section.imageUrl})` } : undefined}>
                <h2>{title || (isAr ? 'بنر ترويجي' : 'Promotional banner')}</h2>
                <p>{subtitle}</p>
                {buttonText ? <Link href={buttonUrl}>{buttonText}</Link> : null}
              </div>
            </section>
          );
        }

        if (type === 'stats') {
          return (
            <section key={section.id || type} className="mh-metrics-band pb-section"><div className="mh-metrics-inner"><div><strong>{projects.length}<span>+</span></strong><p>{isAr ? 'فرصة' : 'Opportunities'}</p></div><div><strong>{projects.filter((p) => p.verified).length}<span>+</span></strong><p>{isAr ? 'موثق' : 'Verified'}</p></div><div><strong>{sectors.length}<span>+</span></strong><p>{isAr ? 'قطاع' : 'Sectors'}</p></div></div></section>
          );
        }

        if (type === 'text_image') {
          return (
            <section key={section.id || type} className="mh-section pb-section pb-text-image" style={sectionStyle(section)}>
              <div className="pb-text-image-copy">
                <h2>{title || (isAr ? 'قسم نص وصورة' : 'Text and image section')}</h2>
                <p>{subtitle}</p>
                {buttonText ? <Link className="pb-primary-link" href={buttonUrl}>{buttonText}</Link> : null}
              </div>
              {section.imageUrl ? <div className="pb-text-image-media" style={{ backgroundImage: `url(${section.imageUrl})` }} /> : null}
            </section>
          );
        }

        if (type === 'steps') {
          const steps = listFromSettings(section, lang, 'itemsAr', 'itemsEn', isAr ? ['أضف مشروعك', 'اختر الباقة', 'تواصل مع المستثمرين'] : ['List your project', 'Choose a plan', 'Connect with investors']);
          return (
            <section key={section.id || type} className="mh-section pb-section">
              <div className="mh-sec-head mh-centered"><h2>{title || (isAr ? 'كيف تعمل المنصة؟' : 'How it works?')}</h2><p>{subtitle}</p></div>
              <div className="pb-steps-grid">{steps.map((step, index) => <div key={step} className="pb-step-card"><b>{index + 1}</b><strong>{step}</strong></div>)}</div>
            </section>
          );
        }

        if (type === 'faq') {
          const questions = listFromSettings(section, lang, 'itemsAr', 'itemsEn', isAr ? ['كيف أضيف مشروعي؟', 'هل التوثيق إلزامي؟', 'كيف أتواصل مع المستثمر؟'] : ['How do I list a project?', 'Is verification required?', 'How do I contact investors?']);
          return (
            <section key={section.id || type} className="mh-section pb-section pb-faq">
              <div className="mh-sec-head mh-centered"><h2>{title || (isAr ? 'أسئلة شائعة' : 'FAQ')}</h2><p>{subtitle}</p></div>
              <div className="pb-faq-list">{questions.map((question, index) => <details key={question} open={index === 0}><summary>{question}</summary><p>{isAr ? 'يمكنك إدارة هذا النص من إعدادات JSON داخل باني الصفحات.' : 'You can edit this content from JSON settings in the page builder.'}</p></details>)}</div>
            </section>
          );
        }

        if (type === 'testimonials') {
          const items = listFromSettings(section, lang, 'itemsAr', 'itemsEn', isAr ? ['تجربة ممتازة وسريعة.', 'المنصة ساعدتنا للوصول لمستثمرين جادين.', 'واجهة سهلة واحترافية.'] : ['Excellent and fast experience.', 'The platform helped us reach serious investors.', 'Easy and professional interface.']);
          return (
            <section key={section.id || type} className="mh-section pb-section">
              <div className="mh-sec-head"><h2>{title || (isAr ? 'آراء المستخدمين' : 'Testimonials')}</h2></div>
              <div className="pb-testimonials-grid">{items.map((item) => <blockquote key={item}>“{item}”<span>{isAr ? 'مستخدم موثق' : 'Verified user'}</span></blockquote>)}</div>
            </section>
          );
        }

        if (type === 'spacer') {
          const height = Number(section.settings?.height || 48);
          return <div key={section.id || type} style={{ height: Math.max(16, Math.min(220, height)) }} />;
        }

        if (type === 'custom_html') {
          const html = String(section.settings?.html || subtitle || '');
          return <section key={section.id || type} className="mh-section pb-section pb-custom-html" dangerouslySetInnerHTML={{ __html: html }} />;
        }

        return (
          <section key={section.id || type} className="mh-cta-band pb-section"><div><h2>{title || (isAr ? 'ابدأ رحلتك الاستثمارية اليوم' : 'Start your investment journey')}</h2><p>{subtitle}</p>{buttonText ? <Link className="mh-btn-white" href={buttonUrl}>{buttonText}</Link> : null}</div></section>
        );
      })}
    </div>
  );
}
