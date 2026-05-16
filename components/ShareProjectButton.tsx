'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export function ShareProjectButton({ title, lang, className = 'project-soft-btn-v34' }: { title: string; lang: string; className?: string }) {
  const isAr = lang === 'ar';
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        alert(isAr ? 'تعذر مشاركة الرابط.' : 'Could not share this link.');
      }
    }
  }

  return (
    <button type="button" onClick={share} className={className}>
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? (isAr ? 'تم نسخ الرابط' : 'Link copied') : (isAr ? 'مشاركة المشروع' : 'Share project')}
    </button>
  );
}
