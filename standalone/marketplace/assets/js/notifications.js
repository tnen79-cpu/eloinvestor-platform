// إلو مستثمر v29 - Global notification badges
(function () {
  async function refreshNotificationBadges() {
    try {
      if (!window.supabaseClient && typeof window.initSupabase === 'function') window.initSupabase();
      if (!window.supabaseClient?.auth) return;
      const { data } = await window.supabaseClient.auth.getUser();
      const user = data?.user;
      if (!user) return;

      let total = 0;
      try {
        const { count } = await window.supabaseClient
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_auth_id', user.id)
          .eq('is_read', false);
        total += Number(count || 0);
      } catch (_) {}
      try {
        const { data: chats } = await window.supabaseClient
          .from('chat_conversations')
          .select('owner_auth_id,investor_auth_id,unread_owner,unread_investor')
          .or(`owner_auth_id.eq.${user.id},investor_auth_id.eq.${user.id}`);
        total += (chats || []).reduce((sum, row) => sum + Number(row.owner_auth_id === user.id ? row.unread_owner || 0 : row.unread_investor || 0), 0);
      } catch (_) {}
      document.querySelectorAll('[href*="chat.html"]').forEach(link => {
        let badge = link.querySelector('.nav-unread-badge');
        if (!total) { if (badge) badge.remove(); return; }
        if (!badge) {
          badge = document.createElement('small');
          badge.className = 'nav-unread-badge';
          link.appendChild(badge);
        }
        badge.textContent = total > 99 ? '99+' : String(total);
      });
      document.querySelectorAll('[data-admin-notification-count], .admin-bell i').forEach(el => {
        if (!total) { el.textContent = ''; el.hidden = true; }
        else { el.hidden = false; el.textContent = total > 99 ? '99+' : String(total); }
      });
    } catch (err) { console.warn('notification badge failed', err); }
  }

  async function subscribeGlobalNotifications() {
    try {
      if (!window.supabaseClient?.channel) return;
      const { data } = await window.supabaseClient.auth.getUser();
      const user = data?.user;
      if (!user) return;
      if (window.__aloNotificationsChannel) return;
      window.__aloNotificationsChannel = window.supabaseClient
        .channel(`global-notifications-${user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_auth_id=eq.${user.id}` }, refreshNotificationBadges)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_conversations' }, refreshNotificationBadges)
        .subscribe();
      window.addEventListener('beforeunload', () => {
        try { if (window.__aloNotificationsChannel) window.supabaseClient.removeChannel(window.__aloNotificationsChannel); } catch {}
        window.__aloNotificationsChannel = null;
      }, { once:true });
    } catch (_) {}
  }

  window.refreshNotificationBadges = refreshNotificationBadges;
  window.subscribeGlobalNotifications = subscribeGlobalNotifications;

  function bootNotifications() {
    setTimeout(refreshNotificationBadges, 300);
    setTimeout(subscribeGlobalNotifications, 650);
  }

  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', bootNotifications);
  else bootNotifications();
})();
