'use client';

import { Share2 } from 'lucide-react';
import { useState } from 'react';

export function ShareProfileButton({ name, lang }: { name: string; lang: string }) {
  const isAr = lang === 'ar';
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    const text = isAr ? `تعرّف على ${name} في إلو مستثمر` : `Check out ${name} on EloInvestor`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: text, url });
        return;
      } catch {
        // fall through to clipboard
      }
    }

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button type="button" onClick={handleShare} className="profile-outline">
      <Share2 size={16} />
      {copied ? (isAr ? 'تم النسخ ✓' : 'Copied ✓') : (isAr ? 'شارك' : 'Share')}
    </button>
  );
}
