import { Images } from 'lucide-react';

export function ProjectGallery({ images, title }: { images: string[]; title: string }) {
  const safeImages = images.length ? images : ['https://images.unsplash.com/photo-1497366754035-f200968a6e72?q=80&w=1600&auto=format&fit=crop'];
  const [main, ...rest] = safeImages;
  const thumbs = rest.slice(0, 4);

  return (
    <div className="overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-100">
          <img src={main} alt={title} className="h-[330px] w-full object-cover sm:h-[460px]" />
          <span className="absolute bottom-5 start-5 inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-black text-slate-900 shadow backdrop-blur">
            <Images size={17} /> {safeImages.length} صور
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 lg:grid-cols-1">
          {thumbs.length ? thumbs.map((src, index) => (
            <div key={src + index} className="overflow-hidden rounded-2xl bg-slate-100">
              <img src={src} alt={`${title} ${index + 2}`} className="h-20 w-full object-cover sm:h-24 lg:h-[105px]" />
            </div>
          )) : [1, 2, 3, 4].map((item) => <div key={item} className="hidden rounded-2xl bg-slate-100 lg:block" />)}
        </div>
      </div>
    </div>
  );
}
