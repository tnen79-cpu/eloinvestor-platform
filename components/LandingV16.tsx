import Link from 'next/link';
import { ArrowUpLeft, ArrowUpRight, BadgeCheck, Building2, ChartNoAxesCombined, ChevronLeft, ChevronRight, LockKeyhole, Search, ShieldCheck, Sparkles, Wallet } from 'lucide-react';
import { ProjectCard } from '@/components/ProjectCard';
import { SmartRecommendations } from '@/components/SmartRecommendations';
import { SponsoredProjectsStrip } from '@/components/SponsoredProjectsStrip';
import type { DbCountry, UiAd, UiProject, UiSlide, UiSector, UiTranslations } from '@/lib/server-data';

type Props={country:DbCountry;lang:string;projects:UiProject[];slides?:UiSlide[];ads?:UiAd[];sectors?:UiSector[];translations?:UiTranslations};
const fallbacks=[
  {key:'restaurants',nameAr:'المطاعم والمقاهي',nameEn:'Food & beverage',icon:'☕'},
  {key:'tech',nameAr:'التقنية والتطبيقات',nameEn:'Technology',icon:'✦'},
  {key:'retail',nameAr:'التجزئة والتجارة',nameEn:'Retail',icon:'◈'},
  {key:'services',nameAr:'الخدمات',nameEn:'Services',icon:'◎'},
  {key:'manufacturing',nameAr:'الصناعة والإنتاج',nameEn:'Manufacturing',icon:'▧'},
  {key:'real_estate',nameAr:'العقارات',nameEn:'Real estate',icon:'⌂'}
];
export function LandingV16({country,lang,projects,sectors=[]}:Props){
 const ar=lang==='ar',base=`/${country.code}/${lang}`,Arrow=ar?ArrowUpLeft:ArrowUpRight,Chevron=ar?ChevronLeft:ChevronRight;
 const categories=sectors.length?sectors:fallbacks.map((s,i)=>({...s,id:s.key,imageUrl:'',countryCode:country.code,isActive:true,sortOrder:i,projectCount:0}));
 const featured=projects.filter(p=>p.status!=='rejected').slice(0,6);
 const verified=projects.filter(p=>p.verified).length;
 const value=new Intl.NumberFormat(ar?'ar-OM':'en-US');
 return <main dir={ar?'rtl':'ltr'} className="elo-redesign min-h-screen overflow-hidden bg-[#f7f8fb] text-[#17213a]">
  <section className="relative isolate overflow-hidden bg-[#101e39] text-white">
   <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-44 h-[550px] w-[550px] rounded-full bg-[#2867c8]/20 blur-3xl"/>
   <div aria-hidden="true" className="pointer-events-none absolute -bottom-72 right-0 h-[620px] w-[620px] rounded-full bg-[#52b6a0]/10 blur-3xl"/>
   <div className="relative mx-auto grid max-w-[1280px] gap-12 px-5 pb-16 pt-16 sm:px-8 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:py-24">
    <div>
     <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold text-[#b9d7ff]"><Sparkles size={15}/>{ar?'الاستثمار يبدأ بقرار مدروس':'Better opportunities. Informed decisions.'}</div>
     <h1 className="max-w-3xl text-[clamp(2.5rem,5vw,4.7rem)] font-black leading-[1.18] tracking-tight">{ar?'فرصتك القادمة تبدأ ': 'Your next opportunity starts '}<span className="text-[#77d6c4]">{ar?'من هنا.':'here.'}</span></h1>
     <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 md:text-lg">{ar?'اكتشف مشاريع قائمة وفرص شراكة، قارن البيانات، واحفظ ملاحظاتك وتواصل بموافقتك. كل قرار استثماري يستحق صورة أوضح.':'Discover businesses and partnership opportunities, compare the numbers, keep your research in one place and connect on your terms.'}</p>
     <div className="mt-9 flex flex-wrap gap-3"><Link className="inline-flex min-h-12 items-center gap-3 rounded-2xl bg-[#8de3d0] px-6 py-3 font-black text-[#10253f] transition hover:bg-white" href={base+'/opportunities'}>{ar?'استكشف الفرص':'Explore opportunities'}<Arrow size={18}/></Link><Link className="inline-flex min-h-12 items-center gap-3 rounded-2xl border border-white/25 px-6 py-3 font-bold text-white transition hover:bg-white/10" href={base+'/add-project'}>{ar?'اعرض مشروعك':'List your business'}</Link></div>
     <div className="mt-12 flex flex-wrap gap-x-9 gap-y-4 border-t border-white/15 pt-7"><div><strong className="block text-3xl font-black">{value.format(projects.length)}</strong><span className="text-sm text-slate-300">{ar?'فرصة معروضة':'Listed opportunities'}</span></div><div><strong className="block text-3xl font-black">{value.format(verified)}</strong><span className="text-sm text-slate-300">{ar?'فرصة بعلامة توثيق':'Verified listings'}</span></div><div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><ShieldCheck size={20} className="text-[#8de3d0]"/>{ar?'البيانات لا تُشارك دون موافقتك':'Contact sharing requires consent'}</div></div>
    </div>
    <div className="relative">
      <div className="rounded-[30px] border border-white/20 bg-white p-6 text-[#17213a] shadow-[0_30px_100px_rgba(0,0,0,.22)] sm:p-8">
       <div className="mb-7 flex items-start justify-between gap-4"><div><span className="text-xs font-black uppercase tracking-widest text-[#3971bd]">{ar?'اكتشف الآن':'FIND A MATCH'}</span><h2 className="mt-2 text-2xl font-black">{ar?'ما هي فرصتك المثالية؟':'What are you looking for?'}</h2></div><div className="rounded-2xl bg-[#eaf4ff] p-3 text-[#2766ae]"><Search size={23}/></div></div>
       <form action={base+'/opportunities'} method="get" className="grid gap-4">
        <label className="grid gap-2 text-sm font-bold">{ar?'ابحث عن مشروع':'Search opportunities'}<input name="q" type="search" className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4 outline-none focus:border-[#3478c8]" placeholder={ar?'مطعم، متجر، تطبيق...':'Restaurant, shop, app...'}/></label>
        <label className="grid gap-2 text-sm font-bold">{ar?'القطاع':'Sector'}<select name="sector" className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4"><option value="all">{ar?'كل القطاعات':'All sectors'}</option>{categories.map(s=><option value={s.key} key={s.key}>{ar?s.nameAr:s.nameEn}</option>)}</select></label>
        <label className="grid gap-2 text-sm font-bold">{ar?'الميزانية القصوى':'Maximum budget'}<input name="maxPrice" type="number" min="0" step="1" placeholder={country.currency||'OMR'} className="h-12 w-full rounded-xl border border-slate-200 bg-[#f8fafc] px-4"/></label>
        <button className="mt-2 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#2463af] font-black text-white hover:bg-[#164a8d]" type="submit"><Search size={18}/>{ar?'عرض الفرص المناسبة':'Search opportunities'}</button>
       </form>
       <p className="mt-5 flex items-center gap-2 text-xs text-slate-500"><LockKeyhole size={15}/>{ar?'يمكنك المقارنة والبحث قبل التواصل':'Browse and compare before contacting owners'}</p>
      </div>
    </div>
   </div>
  </section>
  <section className="mx-auto max-w-[1280px] px-5 py-14 sm:px-8 lg:py-20">
   <div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="mb-2 text-sm font-black text-[#3679bc]">{ar?'اكتشف السوق':'EXPLORE THE MARKET'}</p><h2 className="text-3xl font-black md:text-4xl">{ar?'ابدأ من القطاع المناسب لك':'Explore by industry'}</h2></div><Link href={base+'/opportunities'} className="inline-flex items-center gap-2 text-sm font-bold text-[#2463af]">{ar?'كل الفرص':'All opportunities'}<Chevron size={16}/></Link></div>
   <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{categories.slice(0,6).map(s=><Link key={s.key} href={base+'/opportunities?sector='+encodeURIComponent(s.key)} className="group rounded-[22px] border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-[#97d7cb] hover:shadow-xl"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#ecf4fa] text-2xl text-[#2463af]">{s.icon||'◇'}</span><strong className="mt-5 block text-base font-black">{ar?s.nameAr:s.nameEn}</strong><span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#2463af]">{ar?'تصفح':'Explore'}<Chevron size={13}/></span></Link>)}</div>
  </section>
  <section className="bg-white py-16 lg:py-20"><div className="mx-auto max-w-[1280px] px-5 sm:px-8"><div className="mb-8 flex flex-wrap items-end justify-between gap-5"><div><p className="mb-2 text-sm font-black text-[#3679bc]">{ar?'فرص السوق':'OPPORTUNITIES'}</p><h2 className="text-3xl font-black md:text-4xl">{ar?'فرص تستحق الاستكشاف':'Opportunities worth exploring'}</h2><p className="mt-3 text-sm text-slate-500">{ar?'قارن البيانات وتحقق منها قبل اتخاذ أي قرار.':'Always verify financial information before making a decision.'}</p></div><Link className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 font-bold text-[#2463af]" href={base+'/opportunities'}>{ar?'استعرض جميع الفرص':'View all listings'}<Arrow size={16}/></Link></div>{featured.length?<div className="market-grid">{featured.map(p=><ProjectCard key={p.id||p.slug} project={p} country={country} lang={lang}/>)}</div>:<div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-600">{ar?'لم تُنشر فرص بعد.':'No opportunities have been published yet.'}</div>}</div></section>
  <section className="mx-auto grid max-w-[1280px] gap-8 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-24"><div><p className="mb-3 text-sm font-black text-[#3679bc]">{ar?'أدوات لاتخاذ قرار أفضل':'BUILT FOR CONFIDENT DECISIONS'}</p><h2 className="text-3xl font-black leading-snug md:text-4xl">{ar?'أكثر من مجرد إعلانات مشاريع':'More than a listings directory'}</h2><p className="mt-5 max-w-xl leading-8 text-slate-600">{ar?'مساحة واحدة تساعدك على اكتشاف الفرص ومقارنة الأرقام وتوثيق خطوات المراجعة قبل المحادثة.':'One workspace for discovery, comparison and due diligence before you start a conversation.'}</p><Link href={base+'/workspace'} className="mt-7 inline-flex items-center gap-2 font-black text-[#2463af]">{ar?'افتح مساحة المستثمر':'Open investor workspace'}<Arrow size={17}/></Link></div><div className="grid gap-3 sm:grid-cols-2">{[{icon:ChartNoAxesCombined,ar:'مقارنة واقعية',en:'Compare the numbers',descAr:'قارن حتى أربع فرص ومصادر العائد.',descEn:'Compare four listings and ROI sources.'},{icon:Wallet,ar:'حاسبة استثمار',en:'Investment scenarios',descAr:'اختبر سعر الشراء والتكاليف والأرباح.',descEn:'Model costs, purchase price and returns.'},{icon:ShieldCheck,ar:'توثيق ومراجعة',en:'Verify and review',descAr:'راجع حالة التوثيق وقائمة الفحص.',descEn:'Review verification and due diligence.'},{icon:Building2,ar:'متابعة منظمة',en:'Organized follow-up',descAr:'احفظ المشاريع وملاحظاتك الخاصة.',descEn:'Save projects and private notes.'}].map(f=><div key={f.en} className="rounded-2xl border border-slate-200 bg-white p-6"><f.icon size={26} className="text-[#2463af]"/><h3 className="mt-5 font-black">{ar?f.ar:f.en}</h3><p className="mt-2 text-sm leading-7 text-slate-500">{ar?f.descAr:f.descEn}</p></div>)}</div></section>
  <section className="bg-[#132843] py-16 text-white"><div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-8 px-5 sm:px-8"><div><h2 className="text-3xl font-black">{ar?'عندك مشروع يستحق الفرصة؟':'Have a business worth discovering?'}</h2><p className="mt-3 text-slate-300">{ar?'انشر بيانات مشروعك وابدأ استقبال اهتمام المستثمرين وفق ضوابط التواصل.':'List your business and manage investor interest with contact controls.'}</p></div><Link className="inline-flex items-center gap-2 rounded-2xl bg-[#8de3d0] px-7 py-4 font-black text-[#14253f]" href={base+'/add-project'}>{ar?'أضف مشروعك':'List your business'}<Arrow size={18}/></Link></div></section>
  <div className="mx-auto max-w-[1280px] px-5 py-10 sm:px-8"><SmartRecommendations country={country.code} lang={lang}/><SponsoredProjectsStrip projects={featured.filter(p=>p.isSponsored)} country={country} lang={lang}/></div>
 </main>;
}
