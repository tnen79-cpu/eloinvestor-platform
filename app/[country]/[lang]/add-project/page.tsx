import { getDictionary } from '@/lib/data';

export default async function AddProjectPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="rounded-[3rem] bg-white p-8 shadow-sm">
        <h1 className="text-4xl font-black text-slate-950">{t.addProject}</h1>
        <p className="mt-3 text-slate-600">{lang === 'ar' ? 'نسخة أولية من نموذج إضافة المشروع. سيتم ربطها بقاعدة Supabase في المرحلة القادمة.' : 'Initial add project form. Supabase integration comes next.'}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <input className="rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder={lang === 'ar' ? 'اسم المشروع' : 'Project name'} />
          <input className="rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none" placeholder={lang === 'ar' ? 'السعر' : 'Price'} />
          <textarea className="min-h-40 rounded-2xl border border-slate-200 px-5 py-4 font-bold outline-none md:col-span-2" placeholder={lang === 'ar' ? 'وصف المشروع' : 'Project description'} />
        </div>
        <button className="mt-6 rounded-2xl bg-emerald-700 px-7 py-4 font-black text-white">{lang === 'ar' ? 'حفظ كمسودة' : 'Save draft'}</button>
      </div>
    </main>
  );
}
