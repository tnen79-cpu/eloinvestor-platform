'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Megaphone, Pencil } from 'lucide-react';
import { ContactActions } from '@/components/ContactActions';

type Props = {
  country: string;
  lang: string;
  projectId: string;
  projectTitle: string;
  ownerId?: string;
  whatsapp?: string;
  projectSnapshot?: Record<string, unknown>;
  isSponsored?: boolean;
};

export function ProjectOwnerActions(props: Props) {
  const isAr = props.lang === 'ar';
  const [viewerId, setViewerId] = useState('');

  useEffect(() => {
    let mounted = true;
    import('@/lib/supabase-browser').then(({ supabaseBrowser }) => {
      supabaseBrowser.auth.getUser().then(({ data }) => {
        if (mounted) setViewerId(data.user?.id || '');
      });
    });
    return () => { mounted = false; };
  }, []);

  const isOwner = Boolean(viewerId && props.ownerId && viewerId === props.ownerId);

  if (isOwner) {
    return (
      <div className="owner-project-actions-v34">
        <Link className="project-primary-btn-v34" href={`/${props.country}/${props.lang}/add-project?edit=${encodeURIComponent(props.projectId)}`}>
          <Pencil size={16} /> {isAr ? 'تعديل المشروع' : 'Edit project'}
        </Link>
        <Link className="project-outline-btn-v34" href={`/${props.country}/${props.lang}/promote/${encodeURIComponent(props.projectId)}`}>
          <Megaphone size={16} /> {isAr ? 'ترويج المشروع' : 'Promote project'}
        </Link>
        <p className="project-action-note-v34">{isAr ? 'هذه الأزرار تظهر لك فقط لأنك صاحب المشروع.' : 'These actions are visible because you own this project.'}</p>
      </div>
    );
  }

  return <ContactActions {...props} showInvest showWhatsapp />;
}
