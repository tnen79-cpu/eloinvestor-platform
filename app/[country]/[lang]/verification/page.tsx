export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { VerificationCenter } from '@/components/VerificationCenter';

export default async function VerificationPage({ params }: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await params;
  const isAr = lang === 'ar';
  return (
    <main className="platform-page-wide">
      <section className="platform-hero">
        <span className="platform-eyebrow">{isAr ? 'مركز الثقة' : 'Trust center'}</span>
        <h1 className="platform-title">{isAr ? 'التوثيق والتحقق' : 'Verification and trust'}</h1>
        <p className="platform-subtitle">{isAr ? 'ارفع مستندات المشروع أو بيانات المستثمر لبناء الثقة قبل أي تواصل جاد.' : 'Upload project or investor documents to build trust before serious conversations.'}</p>
      </section>
      <section className="platform-section platform-card platform-card-pad">
        <VerificationCenter country={country} lang={lang} />
      </section>
    </main>
  );
}
