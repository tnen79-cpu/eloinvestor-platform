'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ExternalLink, Heart, MessageCircleMore, Pause, Play, Send, Share2, Volume2, VolumeX } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type ReelProject = {
  id?: string | null;
  slug?: string | null;
  title?: string | null;
  title_ar?: string | null;
  title_en?: string | null;
  city?: string | null;
  country_code?: string | null;
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  phone_country_code?: string | null;
  whatsapp_country_code?: string | null;
  price?: number | string | null;
  asking_price?: number | string | null;
};

type ReelItem = {
  id: string;
  videoUrl: string;
  title?: string | null;
  fileName?: string | null;
  projectId?: string | null;
  likesCount?: number | null;
  sharesCount?: number | null;
  contactsCount?: number | null;
  project?: ReelProject | null;
};

type Props = {
  country: string;
  lang: string;
  items: ReelItem[];
};

function cleanPhone(value?: string | null) {
  return String(value || '').replace(/[^0-9]/g, '');
}

function cleanCode(value?: string | null) {
  const digits = cleanPhone(value || '+968');
  return digits || '968';
}

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}K`;
  return String(value);
}

function getProjectTitle(item: ReelItem, isAr: boolean) {
  const project = item.project;
  if (isAr) return project?.title_ar || project?.title || item.title || 'مشروع استثماري';
  return project?.title_en || project?.title || item.title || 'Investment opportunity';
}

function getWhatsappUrl(item: ReelItem) {
  const project = item.project;
  const raw = project?.contact_whatsapp || project?.contact_phone;
  const phone = cleanPhone(raw);
  if (!phone) return null;
  const code = cleanCode(project?.whatsapp_country_code || project?.phone_country_code);
  const full = phone.startsWith(code) ? phone : `${code}${phone}`;
  return `https://wa.me/${full}`;
}

export function ProjectReelsExperience({ country, lang, items }: Props) {
  const isAr = lang === 'ar';
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const [activeId, setActiveId] = useState(items[0]?.id || '');
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [likes, setLikes] = useState<Record<string, number>>(() => Object.fromEntries(items.map((item) => [item.id, Number(item.likesCount || 0)])));
  const [shares, setShares] = useState<Record<string, number>>(() => Object.fromEntries(items.map((item) => [item.id, Number(item.sharesCount || 0)])));

  const activeIndex = useMemo(() => items.findIndex((item) => item.id === activeId), [activeId, items]);
  const activeItem = items[activeIndex] || items[0];

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const cards = Array.from(root.querySelectorAll<HTMLElement>('[data-reel-id]'));
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target.getAttribute('data-reel-id');
        if (id) setActiveId(id);
      },
      { root, threshold: [0.55, 0.72, 0.9] }
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([id, video]) => {
      if (!video) return;
      video.muted = muted;
      if (id === activeId && !paused) {
        video.play().catch(() => undefined);
      } else {
        video.pause();
      }
    });
  }, [activeId, muted, paused]);

  function scrollToIndex(index: number) {
    const root = containerRef.current;
    const target = items[index];
    if (!root || !target) return;
    const node = root.querySelector<HTMLElement>(`[data-reel-id="${target.id}"]`);
    node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function toggleLike(item: ReelItem) {
    const wasLiked = Boolean(liked[item.id]);
    setLiked((prev) => ({ ...prev, [item.id]: !wasLiked }));
    setLikes((prev) => ({ ...prev, [item.id]: Math.max(0, Number(prev[item.id] || 0) + (wasLiked ? -1 : 1)) }));

    try {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return;
      if (wasLiked) {
        await supabaseBrowser.from('project_video_likes').delete().eq('video_id', item.id).eq('user_auth_id', uid);
      } else {
        await supabaseBrowser.from('project_video_likes').upsert({ video_id: item.id, project_id: item.projectId, user_auth_id: uid });
      }
    } catch (error) {
      console.warn('Reel like skipped:', error);
    }
  }

  async function shareReel(item: ReelItem) {
    const projectId = item.project?.slug || item.project?.id || item.projectId || '';
    const url = `${window.location.origin}/${country}/${lang}/project/${projectId}`;
    const title = getProjectTitle(item, isAr);
    try {
      if (navigator.share) await navigator.share({ title, url });
      else await navigator.clipboard.writeText(url);
      setShares((prev) => ({ ...prev, [item.id]: Number(prev[item.id] || 0) + 1 }));
      await supabaseBrowser.from('project_video_shares').insert({ video_id: item.id, project_id: item.projectId, share_url: url });
    } catch (error) {
      console.warn('Reel share skipped:', error);
    }
  }

  async function contactProject(item: ReelItem) {
    const href = getWhatsappUrl(item);
    if (!href) return;
    try {
      const { data: auth } = await supabaseBrowser.auth.getUser();
      const uid = auth.user?.id;
      if (uid && item.projectId) {
        await supabaseBrowser.from('investor_contacted_projects').upsert({ investor_auth_id: uid, project_id: item.projectId });
      }
      if (item.projectId) await supabaseBrowser.rpc('increment_project_contact_count', { p_project_id: item.projectId });
      await supabaseBrowser.rpc('increment_project_video_contact', { p_video_id: item.id });
    } catch (error) {
      console.warn('Reel contact log skipped:', error);
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  }

  function onVideoEnded() {
    const next = activeIndex + 1;
    if (next < items.length) scrollToIndex(next);
  }

  if (!items.length) {
    return (
      <main className="fixed inset-0 z-[9999] grid place-items-center bg-black px-6 text-center text-white" dir={isAr ? 'rtl' : 'ltr'}>
        <div>
          <p className="text-6xl">▶</p>
          <h1 className="mt-5 text-3xl font-black">{isAr ? 'لا توجد ريلز حالياً' : 'No reels yet'}</h1>
          <p className="mt-3 font-bold text-white/60">{isAr ? 'ارفع فيديو لمشروع منشور حتى يظهر هنا.' : 'Upload a video for a published project to show it here.'}</p>
          <Link href={`/${country}/${lang}`} className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-black text-black">
            {isAr ? 'العودة للرئيسية' : 'Back home'}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 z-[9999] overflow-hidden bg-black text-white" dir={isAr ? 'rtl' : 'ltr'}>
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/70 via-black/20 to-transparent px-4 pb-16 pt-[calc(14px+env(safe-area-inset-top))]">
        <div className="mx-auto flex w-full max-w-[560px] items-center justify-between gap-3">
          <Link href={`/${country}/${lang}`} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-xl ring-1 ring-white/15">
            <ArrowRight className={isAr ? '' : 'rotate-180'} size={20} />
          </Link>
          <div className="rounded-full bg-white/15 px-4 py-2 text-sm font-black backdrop-blur-xl ring-1 ring-white/15">
            {isAr ? 'ريلز المشاريع' : 'Project Reels'}
          </div>
          <button type="button" onClick={() => setMuted((prev) => !prev)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-xl ring-1 ring-white/15">
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>
      </div>

      <div ref={containerRef} className="h-dvh snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const title = getProjectTitle(item, isAr);
          const href = `/${country}/${lang}/project/${item.project?.slug || item.project?.id || item.projectId}`;
          const city = item.project?.city;
          const price = item.project?.price || item.project?.asking_price;
          const canContact = Boolean(getWhatsappUrl(item));
          return (
            <section key={item.id} data-reel-id={item.id} className="relative mx-auto h-dvh w-full max-w-[560px] snap-start snap-always overflow-hidden bg-black">
              <button type="button" onClick={() => setPaused((prev) => !prev)} className="absolute inset-0 z-10 cursor-pointer" aria-label={paused ? 'Play' : 'Pause'} />
              <video
                ref={(node) => {
                  videoRefs.current[item.id] = node;
                }}
                src={item.videoUrl}
                className="h-full w-full object-contain bg-black"
                playsInline
                muted={muted}
                loop={false}
                preload="metadata"
                onEnded={onVideoEnded}
              />

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/20" />

              {paused && item.id === activeId ? (
                <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-black/40 backdrop-blur-xl ring-1 ring-white/20">
                    <Play className="fill-white" size={34} />
                  </div>
                </div>
              ) : null}

              <aside className={`absolute bottom-28 z-30 flex flex-col items-center gap-4 ${isAr ? 'left-4' : 'right-4'}`}>
                <button type="button" onClick={() => toggleLike(item)} className="grid gap-1 text-center">
                  <span className={`grid h-[52px] w-[52px] place-items-center rounded-full backdrop-blur-xl ring-1 ring-white/20 ${liked[item.id] ? 'bg-rose-500 text-white' : 'bg-black/35 text-white'}`}>
                    <Heart className={liked[item.id] ? 'fill-white' : ''} size={25} />
                  </span>
                  <b className="text-xs drop-shadow">{formatCount(Number(likes[item.id] || 0))}</b>
                </button>

                <button type="button" onClick={() => shareReel(item)} className="grid gap-1 text-center">
                  <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-black/35 text-white backdrop-blur-xl ring-1 ring-white/20">
                    <Share2 size={25} />
                  </span>
                  <b className="text-xs drop-shadow">{formatCount(Number(shares[item.id] || 0))}</b>
                </button>

                <button type="button" onClick={() => contactProject(item)} disabled={!canContact} className="grid gap-1 text-center disabled:opacity-40">
                  <span className="grid h-[52px] w-[52px] place-items-center rounded-full bg-blue-600 text-white shadow-2xl shadow-blue-950/30 ring-1 ring-white/20">
                    <MessageCircleMore size={25} />
                  </span>
                  <b className="text-xs drop-shadow">{isAr ? 'شات' : 'Chat'}</b>
                </button>
              </aside>

              <div className={`absolute bottom-0 z-30 w-full px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-20 ${isAr ? 'text-right' : 'text-left'}`}>
                <div className="max-w-[78%]">
                  <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black text-white backdrop-blur-xl ring-1 ring-white/15">
                    <ExternalLink size={14} /> {isAr ? 'فتح المشروع' : 'Open project'}
                  </Link>
                  <h1 className="mt-3 line-clamp-2 text-2xl font-black leading-tight drop-shadow-xl">{title}</h1>
                  <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-white/80 drop-shadow">
                    {city ? `${city} · ` : ''}{price ? `${Number(price).toLocaleString('en-US')} OMR` : (isAr ? 'فرصة استثمارية بالفيديو' : 'Video investment opportunity')}
                  </p>
                  <div className="mt-4 flex items-center gap-2">
                    <button type="button" onClick={() => contactProject(item)} disabled={!canContact} className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-black text-white shadow-2xl shadow-black/30 disabled:opacity-50">
                      <Send size={17} /> {isAr ? 'تواصل الآن' : 'Contact now'}
                    </button>
                    <button type="button" onClick={() => setPaused((prev) => !prev)} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur-xl ring-1 ring-white/15">
                      {paused && item.id === activeId ? <Play size={20} /> : <Pause size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
