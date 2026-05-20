import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'إلو مستثمر | منصة الاستثمار الذكي';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 60%, #1d4ed8 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* background pattern dots */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px', display: 'flex' }} />

        {/* logo mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#1d4ed8', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.2rem', color: '#fff', fontWeight: 900 }}>
            إ
          </div>
          <span style={{ fontSize: '2.6rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-1px' }}>
            إلو مستثمر
          </span>
        </div>

        <p style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.75)', margin: 0, fontWeight: 500, textAlign: 'center', maxWidth: 700 }}>
          منصة الاستثمار الذكي في عُمان والخليج
        </p>

        {/* stats strip */}
        <div style={{ display: 'flex', gap: '48px', marginTop: '48px', background: 'rgba(255,255,255,0.08)', borderRadius: '16px', padding: '20px 48px', border: '1px solid rgba(255,255,255,0.15)' }}>
          {[['فرص نشطة', '100+'], ['موثّقة', '50+'], ['محافظة', '11']].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 900, color: '#fff' }}>{val}</span>
              <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>{label}</span>
            </div>
          ))}
        </div>

        <div style={{ position: 'absolute', bottom: 32, fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>
          eloinvestor.com
        </div>
      </div>
    ),
    { ...size }
  );
}
