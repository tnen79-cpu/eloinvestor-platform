'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, X } from 'lucide-react';
import { supabaseBrowser } from '@/lib/supabase-browser';

type NotificationRow = {
  id: string;
  user_auth_id?: string | null;
  user_id?: string | null;
  target_user_id?: string | null;
  title?: string | null;
  body?: string | null;
  content?: string | null;
  type?: string | null;
  link_url?: string | null;
  action_url?: string | null;
  is_read?: boolean | null;
  read_at?: string | null;
  created_at?: string | null;
};

export function NotificationCenter({
  country,
  lang,
  compact = false,
}: {
  country: string;
  lang: string;
  compact?: boolean;
}) {
  const isAr = lang === 'ar';
  const [userId, setUserId] = useState('');
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<NotificationRow | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastToastIdRef = useRef<string>('');

  const unread = useMemo(
    () => items.filter((item) => !item.is_read && !item.read_at).length,
    [items]
  );

  async function loadNotifications(uid: string, showToast = false) {
    const { data, error } = await supabaseBrowser
      .from('notifications')
      .select('*')
      .or(`user_auth_id.eq.${uid},user_id.eq.${uid},target_user_id.eq.${uid}`)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.warn('Failed to load notifications:', error.message);
      return;
    }

    const rows = (data || []) as NotificationRow[];
    setItems(rows);

    if (showToast && rows.length > 0) {
      const latest = rows[0];
      if (latest?.id && latest.id !== lastToastIdRef.current && !latest.is_read && !latest.read_at) {
        lastToastIdRef.current = latest.id;
        setToast(latest);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => setToast(null), 4500);
      }
    }
  }

  useEffect(() => {
    let mounted = true;

    supabaseBrowser.auth.getUser().then(({ data }) => {
      const uid = data.user?.id || '';
      if (!mounted || !uid) return;
      setUserId(uid);
      void loadNotifications(uid);
    });

    return () => {
      mounted = false;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  // Stable polling version. Realtime was intentionally disabled because older
  // Supabase channel instances in dev/Turbopack caused duplicate subscribed
  // callback errors. This keeps notifications working without crashing the app.
  useEffect(() => {
    if (!userId) return;

    const interval = setInterval(() => {
      void loadNotifications(userId, true);
    }, 15000);

    return () => clearInterval(interval);
  }, [userId]);

  async function markAllRead() {
    if (!userId) return;

    const readAt = new Date().toISOString();

    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        is_read: true,
        read_at: item.read_at || readAt,
      }))
    );

    await supabaseBrowser
      .from('notifications')
      .update({ is_read: true, read_at: readAt })
      .or(`user_auth_id.eq.${userId},user_id.eq.${userId},target_user_id.eq.${userId}`);
  }

  if (!userId) return null;

  return (
    <div className="notification-center" dir={isAr ? 'rtl' : 'ltr'}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={compact ? 'notify-button notify-button-compact' : 'notify-button'}
        aria-label={isAr ? 'الإشعارات' : 'Notifications'}
      >
        <Bell size={18} />
        {unread > 0 ? <span>{unread > 99 ? '99+' : unread}</span> : null}
      </button>

      {open ? (
        <div className="notify-panel">
          <div className="notify-head">
            <b>{isAr ? 'الإشعارات' : 'Notifications'}</b>
            <button type="button" onClick={markAllRead}>
              <CheckCheck size={16} /> {isAr ? 'قراءة الكل' : 'Mark all'}
            </button>
          </div>

          <div className="notify-list">
            {items.length ? (
              items.map((item) => {
                const title = item.title || (isAr ? 'تنبيه جديد' : 'New alert');
                const bodyText = item.body || item.content || '';
                const href = item.link_url || item.action_url || `/${country}/${lang}/dashboard`;
                const unreadClass = !item.is_read && !item.read_at ? 'unread' : '';

                const content = (
                  <>
                    <strong>{title}</strong>
                    <small>{bodyText}</small>
                  </>
                );

                return href.startsWith('/') ? (
                  <Link key={item.id} href={href} className={unreadClass}>
                    {content}
                  </Link>
                ) : (
                  <a key={item.id} href={href} className={unreadClass}>
                    {content}
                  </a>
                );
              })
            ) : (
              <p>{isAr ? 'لا توجد إشعارات بعد.' : 'No notifications yet.'}</p>
            )}
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="platform-toast">
          <button type="button" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
          <strong>{toast.title || (isAr ? 'تنبيه جديد' : 'New notification')}</strong>
          <small>{toast.body || toast.content || ''}</small>
        </div>
      ) : null}
    </div>
  );
}
