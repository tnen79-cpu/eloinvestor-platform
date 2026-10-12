// Fast page-aware app loader - v12
(function () {
  const JS_VERSION = '76.0.0';

  function loadExternalSupabase() {
    return new Promise((resolve, reject) => {
      if (window.supabase) return resolve(true);
      const existing = document.querySelector('script[src*="@supabase/supabase-js"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true), { once:true });
        existing.addEventListener('error', () => reject(new Error('تعذر تحميل مكتبة Supabase')), { once:true });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('تعذر تحميل مكتبة Supabase'));
      document.head.appendChild(s);
    });
  }

  function loadScript(file) {
    return new Promise((resolve,reject) => {
      if (document.querySelector(`script[data-app-file="${file}"]`)) return resolve(true);
      const s = document.createElement('script');
      s.dataset.appFile = file;
      s.src = `assets/js/${file}?v=${JS_VERSION}`;
      s.onload = () => resolve(true);
      s.onerror = () => { console.warn('missing script:',file);reject(new Error('تعذر تحميل ملفات المنصة. أعد تحميل الصفحة.')); };
      document.body.appendChild(s);
    });
  }

  function pageScripts() {
    const path = location.pathname.split('/').pop() || 'index.html';
    const q = (sel) => !!document.querySelector(sel);
    const files = ['flows-v75.js', 'marketplace-core.js', 'investor-core.js', 'investor-tools.js', 'owner-guide.js', 'compare.js', 'config.js', 'utils.js', 'auth.js', 'notifications.js'];

    if (path === 'user-dashboard.html' || q('[data-user-dashboard]')) files.push('verification.js', 'dashboard.js');
    if (['index.html','opportunities.html','add-project.html','edit-my-project.html'].includes(path) || q('[data-project-list],[data-add-project-form],[data-owner-edit-form]')) files.push('projects.js');
    if (path === 'project-details.html' || q('[data-project-details]')) files.push('projects.js', 'project-details.js');
    if (['plans.html','payments.html'].includes(path) || q('[data-plans]')) files.push('plans.js');
    if (path === 'chat.html' || q('[data-chat-app]')) files.push('chat.js');
    if (path.includes('admin') || q('[data-admin-projects],[data-admin-verification],[data-admin-project-review]')) files.push('projects.js','admin.js','admin-verification.js','admin-project-review.js');

    if(['edit-my-project.html','admin-project-edit.html'].includes(path))files.push('editor-v75.js');
    if(path==='verification.html')files.push('verification.js');
    files.push('marketplace-features.js');
    files.push('review-v76.js','app-init.js');
    return [...new Set(files)];
  }

  async function start() {
    try {
      await loadExternalSupabase();
      for (const f of pageScripts()) await loadScript(f);
      if (typeof window.initApp === 'function') await window.initApp();
      if (typeof window.initChat === 'function') window.initChat();
      if (typeof window.refreshNotificationBadges === 'function') window.refreshNotificationBadges();
      if (typeof window.subscribeGlobalNotifications === 'function') window.subscribeGlobalNotifications();
      if (typeof window.installSessionExpiryHandler === 'function') window.installSessionExpiryHandler();
      document.body.classList.add('app-ready');
    } catch (err) {
      console.error(err);
      document.body.classList.add('app-ready');
      document.addEventListener('submit',ev=>ev.preventDefault(),true);
      const root=document.querySelector('main')||document.body;
      const panel=document.createElement('section');panel.className='empty-state';panel.setAttribute('role','alert');
      const title=document.createElement('b');title.textContent='تعذر تحميل المنصة';
      const copy=document.createElement('p');copy.textContent='تحقق من الاتصال ثم أعد المحاولة. البيانات لم تُرسل.';
      const retry=document.createElement('button');retry.type='button';retry.className='btn btn-green';retry.textContent='إعادة المحاولة';retry.onclick=()=>location.reload();
      panel.append(title,copy,retry);root.prepend(panel);

    }
  }


  window.installSessionExpiryHandler = window.installSessionExpiryHandler || function installSessionExpiryHandler(){
    if (window.__aloSessionHandlerInstalled) return;
    window.__aloSessionHandlerInstalled = true;
    function isAuthError(err){
      const msg=String(err?.message||err||'').toLowerCase();
      return msg.includes('jwt') || msg.includes('session') || msg.includes('token') || msg.includes('auth') || msg.includes('401');
    }
    window.addEventListener('unhandledrejection', function(ev){
      if (!isAuthError(ev.reason)) return;
      const next=encodeURIComponent(location.pathname+location.search);
      alert('انتهت الجلسة. سجّل الدخول مرة أخرى للمتابعة.');
      location.href='login.html?next='+next;
    });
  };

  window.addEventListener('DOMContentLoaded', start);
})();
