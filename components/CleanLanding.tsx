import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { EmptyState } from '@/components/EmptyState';
import { type DbCountry, type UiAd, type UiProject, type UiSlide, type UiSector } from '@/lib/server-data';

type Props = { country: DbCountry; lang: string; projects: UiProject[]; slides?: UiSlide[]; ads?: UiAd[]; sectors?: UiSector[] };
const categories = [
  ['🏪','مشاريع للبيع','Projects for sale','sale'],['🤝','شراكة','Partnership','partnership'],['💡','أفكار بمستندات','Documented ideas','idea'],['🛡️','مشاريع موثقة','Verified projects','verified'],['⭐','فرص مميزة','Featured deals','featured'],
];
export function CleanLanding({ country, lang, projects, slides = [], sectors = [] }: Props) {
  const isAr = lang === 'ar';
  const base = `/${country.code}/${lang}`;
  const verified = projects.filter(p=>p.verified).length;
  const sponsored = projects.filter(p=>p.isSponsored).length;
  const visibleSectors = sectors.filter(s=>s.isActive !== false).slice(0,5);
  return <main className="container page">
    <section className="market-hero">
      <div className="market-hero-inner">
        <div>
          <span className="market-kicker">{country.flag} {isAr?'منصة فرص استثمارية':'Investment marketplace'}</span>
          <h1>{isAr?<>استثمر أو اعرض مشروعك <em>بسهولة وأمان</em></>:<>Invest or list your project <em>with confidence</em></>}</h1>
          <p>{isAr?'تصميم واضح وخفيف قريب من تجربة السوق المفتوح: بحث سريع، فلاتر عملية، وكروت مشاريع مرتبة بدون بيانات وهمية.':'A clean marketplace experience with search, filters, and real project data only.'}</p>
          <form className="market-search" action={`${base}/opportunities`}>
            <input name="q" placeholder={isAr?'ابحث عن مشروع أو فرصة':'Search projects'} />
            <select name="city"><option value="">{isAr?'المحافظة':'Governorate'}</option></select>
            <select name="opportunityType"><option value="">{isAr?'نوع الفرصة':'Deal type'}</option><option value="sale">{isAr?'مشروع للبيع':'For sale'}</option><option value="partnership">{isAr?'شراكة':'Partnership'}</option></select>
            <button className="btn btn-primary">{isAr?'بحث':'Search'}</button>
          </form>
        </div>
        <aside className="market-hero-card">
          <div className="section-title"><div><h2>{isAr?'أحدث الفرص':'Latest deals'}</h2><p>{isAr?'تظهر هنا من قاعدة البيانات فقط':'Database only'}</p></div><Link href={`${base}/opportunities`} className="btn btn-outline">{isAr?'الكل':'All'}</Link></div>
          {projects.length ? <div className="hero-project-mini">{projects.slice(0,4).map(p=><Link key={p.id||p.slug} href={`${base}/project/${encodeURIComponent(p.id||p.slug)}`}><img src={p.image} alt=""/><div><b>{isAr?p.titleAr:p.titleEn}</b><span>{isAr?p.cityAr:p.cityEn}</span></div></Link>)}</div> : <div className="empty-box">{isAr?'لا توجد مشاريع منشورة بعد.':'No published projects yet.'}</div>}
        </aside>
      </div>
    </section>
    <section className="section category-row">{categories.map(([icon,ar,en,type])=><Link href={`${base}/opportunities${type==='verified'?'?verified=1':type==='featured'?'?premium=1':`?opportunityType=${type}`}`} className="category-card" key={ar}><i>{icon}</i><b>{isAr?ar:en}</b><span>{isAr?'تصفح':'Browse'}</span></Link>)}</section>
    <section className="section stats-strip">
      <div className="stat-box"><b>{projects.length}</b><span>{isAr?'مشروع منشور':'Listed projects'}</span></div><div className="stat-box"><b>{verified}</b><span>{isAr?'مشروع موثق':'Verified'}</span></div><div className="stat-box"><b>{sponsored}</b><span>{isAr?'فرصة مروّجة':'Promoted'}</span></div><div className="stat-box"><b>{slides.length}</b><span>{isAr?'سلايدر نشط':'Active slides'}</span></div>
    </section>
    <section className="section"><div className="section-title"><div><h2>{isAr?'مشاريع مميزة':'Featured projects'}</h2><p>{isAr?'نفس كروت المشاريع، لكن بهوية نظيفة':'Same project cards, cleaner layout'}</p></div><Link href={`${base}/opportunities`} className="btn btn-outline">{isAr?'عرض الكل':'View all'}</Link></div>{projects.length ? <div className="market-grid">{projects.slice(0,6).map(project=><ProjectCard key={project.id||project.slug} project={project} lang={lang} country={country}/>)}</div> : <EmptyState lang={lang} country={country.code} />}</section>
    {visibleSectors.length ? <section className="section"><div className="section-title"><div><h2>{isAr?'الفئات الرئيسية':'Main categories'}</h2><p>{isAr?'تظهر من لوحة الإدارة فقط':'Loaded from admin data only'}</p></div></div><div className="category-row">{visibleSectors.map(s=><Link href={`${base}/opportunities?sector=${s.key}`} className="category-card" key={s.key}><i>{s.icon||'▦'}</i><b>{isAr?s.nameAr:s.nameEn}</b><span>{s.projectCount || 0}</span></Link>)}</div></section> : null}
  </main>;
}
