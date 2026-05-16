'use client';

import { useEffect, useMemo, useState } from 'react';
import { Images, Maximize2, X } from 'lucide-react';

const fallbackImage = 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop';

export function ProjectMediaGallery({ images, title, lang }: { images: string[]; title: string; lang: string }) {
  const isAr = lang === 'ar';
  const safeImages = useMemo(() => (images?.length ? images : [fallbackImage]).filter(Boolean), [images]);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const current = safeImages[active] || safeImages[0] || fallbackImage;

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(false);
      if (event.key === 'ArrowRight') setActive((value) => (value + 1) % safeImages.length);
      if (event.key === 'ArrowLeft') setActive((value) => (value - 1 + safeImages.length) % safeImages.length);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, safeImages.length]);

  return (
    <>
      <div className="project-media-gallery">
        <div className="project-media-thumbs" aria-label={isAr ? 'صور المشروع' : 'Project images'}>
          {safeImages.slice(0, 4).map((img, index) => (
            <button
              type="button"
              key={`${img}-${index}`}
              className={index === active ? 'active' : ''}
              onClick={() => setActive(index)}
              aria-label={`${isAr ? 'عرض الصورة' : 'Open image'} ${index + 1}`}
            >
              <img src={img} alt={`${title} ${index + 1}`} />
            </button>
          ))}
          {safeImages.length > 4 ? (
            <button type="button" className="more" onClick={() => setLightbox(true)}>
              +{safeImages.length - 4}
              <small>{isAr ? 'عرض المزيد' : 'More'}</small>
            </button>
          ) : null}
        </div>

        <button type="button" className="project-media-cover" onClick={() => setLightbox(true)}>
          <img src={current} alt={title} />
          <span><Maximize2 size={14} /> {isAr ? 'تكبير الصورة' : 'Open image'}</span>
          <b>{active + 1} / {safeImages.length}</b>
        </button>
      </div>

      {lightbox ? (
        <div className="project-lightbox" role="dialog" aria-modal="true" onClick={() => setLightbox(false)}>
          <button type="button" className="project-lightbox-close" onClick={() => setLightbox(false)} aria-label={isAr ? 'إغلاق' : 'Close'}>
            <X size={22} />
          </button>
          <button type="button" className="project-lightbox-image" onClick={(e) => e.stopPropagation()}>
            <img src={current} alt={title} />
          </button>
          <div className="project-lightbox-thumbs" onClick={(e) => e.stopPropagation()}>
            <span><Images size={16} /> {safeImages.length} {isAr ? 'صور' : 'images'}</span>
            {safeImages.map((img, index) => (
              <button type="button" key={`${img}-full-${index}`} className={index === active ? 'active' : ''} onClick={() => setActive(index)}>
                <img src={img} alt={`${title} ${index + 1}`} />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
