'use client';

import Link from 'next/link';
import type { ReactNode, MouseEvent } from 'react';
import { trackPromotionMetric } from '@/lib/promotion-analytics';

type Props = {
  href: string;
  projectId?: string;
  enabled?: boolean;
  className?: string;
  children: ReactNode;
  prefetch?: boolean;
};

export function PromotionClickLink({ href, projectId, enabled, className, children, prefetch }: Props) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!enabled || !projectId || typeof window === 'undefined') return;
    const clickKey = `elo-promo-click-${projectId}`;
    if (sessionStorage.getItem(clickKey)) return;
    sessionStorage.setItem(clickKey, '1');
    void trackPromotionMetric(projectId, 'click');
  }

  return <Link href={href} className={className} prefetch={prefetch} onClick={handleClick}>{children}</Link>;
}
