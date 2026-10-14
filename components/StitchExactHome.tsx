'use client';

import { useEffect, useRef } from 'react';

/** The exported Stitch HTML is deliberately kept in its own document so the
 * original styles remain byte-for-byte unchanged and legacy CSS cannot leak in. */
export function StitchExactHome() {
  const desktop = useRef<HTMLIFrameElement>(null);
  const mobile = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const cleanups: Array<() => void> = [];
    for (const ref of [desktop, mobile]) {
      const frame = ref.current;
      if (!frame) continue;
      let resizeObserver: ResizeObserver | undefined;
      const resize = () => {
        try {
          const doc = frame.contentDocument;
          if (!doc) return;
          frame.style.height = `${Math.max(doc.documentElement.scrollHeight, doc.body?.scrollHeight || 0, 700)}px`;
        } catch { /* iframe still works with its own scrolling */ }
      };
      const loaded = () => {
        resize();
        try {
          const doc = frame.contentDocument;
          if (doc && typeof ResizeObserver !== 'undefined') {
            resizeObserver?.disconnect();
            resizeObserver = new ResizeObserver(resize);
            resizeObserver.observe(doc.documentElement);
            if (doc.body) resizeObserver.observe(doc.body);
          }
          doc?.fonts?.ready.then(resize);
        } catch { /* keep HTML intact */ }
      };
      frame.addEventListener('load', loaded);
      if (frame.contentDocument?.readyState === 'complete') loaded();
      cleanups.push(() => { frame.removeEventListener('load', loaded); resizeObserver?.disconnect(); });
    }
    return () => cleanups.forEach(fn => fn());
  }, []);
  const css = `
    .stitch-original-frame { border: 0; width: 100%; display: block; min-height: 100vh; background: #fff; }
    .stitch-original-mobile { display: none; }
    @media(max-width: 767px) {
      .stitch-original-desktop { display: none; }
      .stitch-original-mobile { display: block; }
    }
  `;
  return <main style={{ width: '100%', background: '#FFFFFF', overflow: 'clip' }}>
    <iframe ref={desktop} title="ألو مستثمر - تصميم الكمبيوتر" src="/stitch/desktop.html" className="stitch-original-frame stitch-original-desktop" />
    <iframe ref={mobile} title="ألو مستثمر - تصميم الهاتف" src="/stitch/mobile.html" className="stitch-original-frame stitch-original-mobile" />
    <style>{css}</style>
  </main>;
}
