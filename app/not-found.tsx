import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f8f9fa', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <main style={{ textAlign: 'center', padding: '2rem 1rem', maxWidth: '480px', width: '100%' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1rem', lineHeight: 1 }}>🔍</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', margin: '0 0 0.75rem' }}>
            الصفحة غير موجودة
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', lineHeight: 1.7, margin: '0 0 2rem' }}>
            الرابط الذي طلبته غير موجود أو ربما تم نقله.
            يمكنك العودة للرئيسية أو تصفح الفرص الاستثمارية المتاحة.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/om/ar"
              style={{ background: '#1d4ed8', color: '#fff', padding: '12px 28px', borderRadius: '999px', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem' }}
            >
              الرئيسية
            </Link>
            <Link
              href="/om/ar/opportunities"
              style={{ background: '#fff', color: '#1d4ed8', padding: '12px 28px', borderRadius: '999px', fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem', border: '1.5px solid #1d4ed8' }}
            >
              تصفح الفرص
            </Link>
          </div>
          <p style={{ marginTop: '2.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
            خطأ 404 · إلو مستثمر
          </p>
        </main>
      </body>
    </html>
  );
}
