// Pixel-faithful Stitch preview entrypoint. The exported HTML files must be added at
// public/stitch/desktop.html and public/stitch/mobile.html before this route can render.
export const metadata = { title: 'ألو مستثمر — معاينة Stitch' };
export default function StitchPreview() {
  return (
    <main style={{ margin: 0, width: '100%', minHeight: '100dvh', background: '#fff' }}>
      <iframe title="EloInvestor Stitch desktop design" src="/stitch/desktop.html" style={{ display: 'block', border: 0, width: '100%', minHeight: '100dvh' }} className="stitch-desktop" />
      <iframe title="EloInvestor Stitch mobile design" src="/stitch/mobile.html" style={{ display: 'none', border: 0, width: '100%', minHeight: '100dvh' }} className="stitch-mobile" />
      <style>{`@media(max-width:767px){.stitch-desktop{display:none!important}.stitch-mobile{display:block!important}}`}</style>
    </main>
  );
}
