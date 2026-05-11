import Link from 'next/link';
import { ProjectCard } from '@/components/ProjectCard';
import { getCountry, getDictionary, projects } from '@/lib/data';

export default async function HomePage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const c = getCountry(country);
  const t = getDictionary(lang);
  const currentProjects = projects.filter((p) => p.country === c.code);

  return (
    <main>
      <section className="relative overflow-hidden bg-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,.14),transparent_30%),radial-gradient(circle_at_90%_10%,rgba(245,158,11,.12),transparent_26%)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">{c.flag} {lang === 'ar' ? c.nameAr : c.nameEn} · {c.currency}</div>
            <h1 className="max-w-3xl text-5xl font-black leading-tight tracking-tight text-emerald-950 sm:text-7xl">{t.heroTitle}</h1>
            <p className="max-w-2xl text-xl leading-9 text-slate-600">{t.heroText}</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href={`/${country}/${lang}/opportunities`} className="rounded-2xl bg-emerald-700 px-7 py-4 text-center font-black text-white shadow-2xl shadow-emerald-900/20">{t.explore}</Link>
              <Link href={`/${country}/${lang}/add-project`} className="rounded-2xl border border-slate-200 bg-white px-7 py-4 text-center font-black text-emerald-950">{t.publish}</Link>
            </div>
          </div>
          <div className="relative min-h-[420px] overflow-hidden rounded-[3rem] bg-emerald-950 shadow-2xl">
            <img src="https://images.unsplash.com/photo-1518005020951-eccb494ad742?q=80&w=1600&auto=format&fit=crop" alt="" className="h-full min-h-[420px] w-full object-cover opacity-75" />
            <div className="absolute bottom-6 start-6 end-6 rounded-[2rem] bg-white/90 p-5 shadow-xl backdrop-blur">
              <p className="text-sm font-black text-slate-500">{t.featured}</p>
              <p className="mt-1 text-2xl font-black text-emerald-950">{currentProjects[0] ? (lang === 'ar' ? currentProjects[0].titleAr : currentProjects[0].titleEn) : t.explore}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h2 className="text-3xl font-black text-slate-950">{t.featured}</h2>
          <Link href={`/${country}/${lang}/opportunities`} className="font-black text-emerald-700">{t.explore}</Link>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentProjects.map((project) => <ProjectCard key={project.slug} project={project} lang={lang} />)}
        </div>
      </section>
    </main>
  );
}
