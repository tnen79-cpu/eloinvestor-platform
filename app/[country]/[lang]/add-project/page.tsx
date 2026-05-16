export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { ProtectedAddProject } from '@/components/ProtectedAddProject';

export default async function AddProjectPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  return (
    <main className="platform-page platform-form-shell">
      <section className="platform-hero">
        <span className="platform-eyebrow">{isAr ? 'صاحب مشروع' : 'Project owner'}</span>
        <h1 className="platform-title">{isAr ? 'أضف مشروعك بطريقة احترافية' : 'List your project professionally'}</h1>
        <p className="platform-subtitle">{isAr ? 'أضف بيانات المشروع، الصور، القطاع، والأرقام المالية. ويمكنك طلب التوثيق أو الترويج المدفوع بعد الحفظ.' : 'Add project details, images, sector, and financials. Verification and paid promotion can be requested after submission.'}</p>
      </section>
      <section className="platform-section platform-card platform-card-pad">
        <ProtectedAddProject country={country} lang={lang} />
      </section>
    </main>
  );
}
