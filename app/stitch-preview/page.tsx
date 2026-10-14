// Stitch export preview: original HTML is served unchanged from /public/stitch.
// This isolated preview does not replace the application's functional homepage.
export const metadata = { title: 'ألو مستثمر — معاينة Stitch' };
export default function StitchPreview() {
  return (
    <main style={{ margin: 0, width: '100%', minHeight: '100dvh', background: '#fff' }}>
      <iframe
        title="EloInvestor Stitch design — unchanged export"
        src="/stitch/desktop.html"
        style={{ display: 'block', border: 0, width: '100%', minHeight: '100dvh' }}
        className="stitch-desktop"
      />
      <iframe
        title="EloInvestor Stitch mobile design — unchanged export"
        src="/stitch/mobile.html"
        style={{ display: 'none', border: 0, width: '100%', minHeight: '100dvh' }}
        className="stitch-mobile"
      />
      <style>{`@media(max-width:767px){.stitch-desktop{display:none!important}.stitch-mobile{display:block!important}}`}</style>
    </main>
  );
}
