// Admin system v20 - إلو مستثمر Admin Control Center
(function(){
  const ADMIN_PERMISSIONS = {
    overview: 'نظرة عامة', projects: 'إدارة المشاريع', verification: 'مراجعة التوثيق', users: 'إدارة المستخدمين', staff: 'حسابات الإدارة', plans: 'إدارة الباقات', payments: 'المدفوعات', ads: 'إدارة الإعلانات', notifications: 'الإشعارات', logs: 'سجل النشاط', chat_moderation: 'مراقبة الشات'
  };
  const ROLE_PERMISSIONS = {
    super_admin: Object.keys(ADMIN_PERMISSIONS), project_reviewer: ['overview','projects','logs'], verification_reviewer: ['overview','verification','projects','logs'], support: ['overview','users','notifications','logs','chat_moderation'], accountant: ['overview','plans','payments','logs'], content_manager: ['overview','projects','ads','notifications','logs']
  };
  const ROLE_LABELS = { super_admin: 'مدير عام', project_reviewer: 'مراجع مشاريع', verification_reviewer: 'مراجع توثيق', support: 'دعم العملاء', accountant: 'محاسب / باقات', content_manager: 'مدير محتوى' };
  const DEFAULT_PLANS = [
    { code:'free', name:'مجانية', price:0, duration_days:30, project_limit:1, features:['مشروع واحد', 'ظهور عادي', 'بدون طلبات مستثمرين'], is_active:true, sort_order:10 },
    { code:'premium', name:'مميزة', price:9, duration_days:30, project_limit:5, features:['5 مشاريع', 'طلبات المستثمرين', 'أولوية ظهور'], is_active:true, sort_order:20 },
    { code:'business', name:'أعمال', price:25, duration_days:30, project_limit:20, features:['20 مشروع', 'طلبات المستثمرين', 'إحصائيات متقدمة', 'دعم أولوية'], is_active:true, sort_order:30 }
  ];

  let adminState = { user:null, profile:null, staff:null, permissions:[], section:'overview', projectFilter:'all', projectSearch:'', userSearch:'', verificationFilter:'all' };
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const esc = (v) => String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const money = (v) => `${Number(v || 0).toLocaleString('ar-OM')} ر.ع`;
  const fmtDate = (v) => { try { return v ? new Date(v).toLocaleString('ar-OM') : '-'; } catch { return '-'; } };
  const shortId = (v) => v ? String(v).slice(0,8) : '-';

  function accountLabel(v){ const val = String(v || '').toLowerCase(); return { investor:'مستثمر', owner:'صاحب مشروع', project_owner:'صاحب مشروع', both:'مستثمر + صاحب مشروع' }[val] || (v || '-'); }
  function hasPerm(key){ return String(adminState.staff?.role || '') === 'super_admin' || adminState.permissions.includes(key) || adminState.permissions.includes('*'); }
  function normalizePerms(perms, role){ return Array.isArray(perms) && perms.length ? perms : (ROLE_PERMISSIONS[role] || []); }
  function featureList(v){ if (Array.isArray(v)) return v; if (!v) return []; try { const parsed = JSON.parse(v); return Array.isArray(parsed) ? parsed : []; } catch { return String(v).split('\n').map(x=>x.trim()).filter(Boolean); } }
  function statusLabel(s){
    const val = String(s || 'pending');
    const map = { approved:['green','مقبول'], pending:['yellow','قيد المراجعة'], rejected:['red','مرفوض'], needs_revision:['blue','بحاجة تعديل'], verified:['green','موثّق'], not_verified:['gray','غير موثّق'], active:['green','فعال'], paid:['green','مدفوع'], premium:['green','مميز'], business:['green','أعمال'], free:['gray','مجاني'], suspended:['yellow','معلّق'], blocked:['red','محظور'], under_review:['yellow','تحت المراجعة'], needs_documents:['blue','مطلوب ملفات'], suspicious:['red','اشتباه'], expired:['gray','منتهي'], approved:['green','مقبول'] };
    const [cls,label] = map[val] || ['blue', val || '-'];
    return `<span class="admin-badge ${cls}">${esc(label)}</span>`;
  }
  function userStatusLabel(u){ if (u?.is_blocked) return statusLabel('blocked'); if (String(u?.account_status || '').toLowerCase() === 'suspended') return statusLabel('suspended'); return statusLabel('active'); }
  function projectVerificationBadge(p){ return statusLabel(p?.verification_status || (p?.is_verified ? 'verified' : 'not_verified')); }

  async function safeCount(table, filterFn){ try { let q = window.supabaseClient.from(table).select('id', { count:'exact', head:true }); if (filterFn) q = filterFn(q); const { count } = await q; return count || 0; } catch { return 0; } }
  async function tableExistsSelect(table, select='*', limit=1){ try { const r = await window.supabaseClient.from(table).select(select).limit(limit); if (r.error) throw r.error; return r.data || []; } catch(e){ console.warn(`${table} not ready`, e.message || e); return null; } }

  async function getAdminContext(){
    const user = await window.getSessionUser?.();
    if (!user) return { allowed:false, reason:'يجب تسجيل الدخول أولاً' };
    let profile = null; let staff = null;
    try { const { data } = await window.supabaseClient.from('users').select('*').eq('auth_id', user.id).maybeSingle(); profile = data; } catch(e){ console.warn('profile read failed', e); }
    try { const { data } = await window.supabaseClient.from('admin_staff').select('*').eq('auth_id', user.id).eq('is_active', true).maybeSingle(); staff = data; } catch(e){ console.warn('admin_staff not ready', e); }
    if (!staff && String(profile?.role || '').toLowerCase() === 'admin') staff = { auth_id:user.id, name:profile?.name || user.email || 'Admin', email:user.email || profile?.email || '', role:'super_admin', permissions:ROLE_PERMISSIONS.super_admin, is_active:true };
    if (!staff) return { allowed:false, reason:'حسابك ليس ضمن فريق الإدارة. أضفك من جدول admin_staff أو اجعل role = admin.' };
    return { allowed:true, user, profile, staff, permissions: normalizePerms(staff.permissions, staff.role) };
  }

  function menuItems(){ return [['overview','🏠','نظرة عامة'],['projects','💼','المشاريع'],['verification','🛡','التوثيق'],['users','👥','المستخدمين'],['staff','🧑‍💼','حسابات الإدارة'],['plans','⭐','الباقات'],['payments','💳','المدفوعات'],['ads','📢','الإعلانات'],['notifications','🔔','الإشعارات'],['chat_moderation','🚩','بلاغات الشات'],['logs','🧾','سجل النشاط']]; }
  function setTitle(title, desc){ $('#adminSectionTitle') && ($('#adminSectionTitle').textContent = title); $('#adminSectionDesc') && ($('#adminSectionDesc').textContent = desc); }
  function content(html){ const el = $('#adminContent'); if (el) el.innerHTML = html; }
  function loading(){ content('<div class="admin-skeleton-v20"><i></i><i></i><i></i><i></i><i></i><i></i></div>'); }
  function locked(){ content('<div class="admin-locked"><b>غير مصرح</b><p>لا تملك صلاحية الوصول إلى هذا القسم.</p></div>'); }
  function toast(msg){ const old = $('.admin-toast'); if(old) old.remove(); const el = document.createElement('div'); el.className = 'admin-toast'; el.textContent = msg; document.body.appendChild(el); setTimeout(()=>el.classList.add('show'), 20); setTimeout(()=>{ el.classList.remove('show'); setTimeout(()=>el.remove(), 250); }, 2600); }

  function renderShell(){
    const root = $('[data-admin-dashboard]'); if (!root) return;
    const staff = adminState.staff || {};
    root.innerHTML = `
      <div class="admin-app-frame admin-reference-dashboard">
        <header class="admin-app-topbar">
          <div class="admin-top-left">
            <a class="admin-top-btn admin-top-btn-green" href="login.html" data-logout-link>تسجيل خروج <span>↪</span></a>
            <a class="admin-top-btn" href="index.html">الموقع الرئيسي <span>◎</span></a>
          </div>
          <div class="admin-top-user">
            <span class="admin-bell">🔔<i data-admin-notification-count hidden></i></span>
            <div class="admin-top-name"><b>أهلاً، ${esc(staff.name || adminState.profile?.name || 'محمد الشامي')}</b><small>${esc(ROLE_LABELS[staff.role] || staff.role || 'مدير عام')}</small></div>
            <span class="admin-avatar-letter">${esc((staff.name || adminState.profile?.name || 'M').trim().slice(0,1).toUpperCase())}</span>
          </div>
        </header>
        <div class="admin-shell admin-v20-shell">
          <aside class="admin-sidebar admin-v20-sidebar">
            <div class="admin-side-brand"><button class="admin-mobile-menu" type="button">☰</button><strong>إلو مستثمر</strong><span>📈</span></div>
            <div class="admin-profile-card"><b>${esc(staff.name || adminState.profile?.name || adminState.user?.email || 'Admin')}</b><span>${esc(ROLE_LABELS[staff.role] || staff.role || 'فريق الإدارة')}</span><em class="admin-role-hint">Control Center</em></div>
            <nav class="admin-nav">${menuItems().map(([key,icon,label]) => `<button type="button" data-admin-section="${key}" class="${adminState.section===key?'active':''} ${hasPerm(key)?'':'is-disabled'}"><span>${icon}</span><b>${label}</b></button>`).join('')}</nav>
            <a class="dash-upgrade" href="login.html"><b>تسجيل خروج</b><span>↪</span></a>
          </aside>
          <section class="admin-main admin-v20-main">
            <div class="admin-topbar admin-v20-topbar"><div><h1 id="adminSectionTitle">لوحة الإدارة</h1><p id="adminSectionDesc">مركز تحكم احترافي للمشاريع، التوثيق، المستخدمين، والباقات.</p></div><div class="admin-actions"><button class="btn btn-outline" data-admin-refresh>تحديث</button></div></div>
            <div class="admin-content" id="adminContent"><div class="admin-skeleton-v20"><i></i><i></i><i></i></div></div>
          </section>
        </div>
      </div>
      <div class="admin-drawer-backdrop" data-drawer-close></div>
      <aside class="admin-review-drawer" id="adminReviewDrawer" aria-hidden="true"></aside>`;
    bindAdminEvents(); renderAdminSection(adminState.section);
  }

  function bindAdminEvents(){
    $$('[data-admin-section]').forEach(btn => btn.addEventListener('click', () => { const key = btn.dataset.adminSection; if (!hasPerm(key)) return toast('لا تملك صلاحية فتح هذا القسم'); adminState.section = key; $$('[data-admin-section]').forEach(b=>b.classList.toggle('active', b.dataset.adminSection===key)); renderAdminSection(key); }));
    $('[data-admin-refresh]')?.addEventListener('click', () => renderAdminSection(adminState.section));
  }

  async function renderAdminSection(section){
    if (!hasPerm(section)) return locked(); loading();
    try {
      if (section === 'overview') return renderOverview();
      if (section === 'projects') return renderProjects();
      if (section === 'verification') return renderVerification();
      if (section === 'users') return renderUsers();
      if (section === 'staff') return renderStaff();
      if (section === 'plans') return renderPlans();
      if (section === 'payments') return renderPayments();
      if (section === 'ads') return renderAds();
      if (section === 'notifications') return renderNotifications();
      if (section === 'chat_moderation') return renderChatModeration();
      if (section === 'logs') return renderLogs();
    } catch(err){ console.error(err); content(`<div class="admin-locked"><b>حدث خطأ</b><p>${esc(err.message || err)}</p></div>`); }
  }

  async function renderOverview(){
    setTitle('نظرة عامة', 'أرقام حقيقية ومؤشرات مهمة لإدارة المنصة.');
    const [users, investors, owners, projects, pending, verified, rejected, contacts, saved, paid, blocked, plans] = await Promise.all([
      safeCount('users'), safeCount('users', q=>q.in('account_type',['investor','both'])), safeCount('users', q=>q.in('account_type',['owner','project_owner','both'])), safeCount('projects'), safeCount('projects', q=>q.eq('status','pending')), safeCount('projects', q=>q.eq('verification_status','verified')), safeCount('projects', q=>q.eq('status','rejected')), safeCount('investor_contacted_projects'), safeCount('investor_saved_projects'), safeCount('users', q=>q.or('subscription_status.eq.active,subscription_status.eq.paid,subscription_status.eq.premium,subscription_status.eq.pro,subscription_status.eq.business,plan.eq.premium,plan.eq.pro,plan.eq.business')), safeCount('users', q=>q.eq('is_blocked', true)), safeCount('admin_plans')
    ]);
    let recentProjects = []; let logs = [];
    try { const r = await window.supabaseClient.from('projects').select('*').order('created_at', {ascending:false}).limit(4); recentProjects = r.data || []; } catch(e){}
    try { const r = await window.supabaseClient.from('admin_activity_logs').select('*').order('created_at', {ascending:false}).limit(6); logs = r.data || []; } catch(e){}
    const totalViews = recentProjects.reduce((n,p)=> n + Number(p.views_count || p.views || 0), 0);
    const totalContacts = recentProjects.reduce((n,p)=> n + Number(p.contacts_count || 0), 0) || contacts;
    const conversion = totalViews ? Math.round((totalContacts / totalViews) * 100) : 0;
    content(`
      <section class="admin-kpi-grid admin-kpi-grid-pro admin-v20-kpis">
        ${kpi('💼','المشاريع الكلية',projects,`${pending} قيد المراجعة`)}
        ${kpi('⏱','قيد المراجعة',pending,`+ ${pending ? Math.min(pending,5) : 0} عن الأمس`)}
        ${kpi('✅','موثقة',verified,'مشاريع أولوية')}
        ${kpi('❌','مرفوضة',rejected,'تحتاج متابعة')}
        ${kpi('👥','المستخدمين',users,`${investors} مستثمر • ${owners} صاحب مشروع`)}
      </section>
      <section class="admin-panel admin-overview-note"><div class="admin-panel-head"><div><h2>نظرة عامة 📈</h2><p>أرقام حقيقية ومؤشرات مهمة لإدارة المنصة.</p></div><button class="btn btn-outline" data-admin-refresh>تحديث</button></div></section>
      <section class="admin-panel admin-latest-projects"><div class="admin-panel-head"><div><h2>أحدث المشاريع</h2><p>اضغط على أي مشروع لمراجعة التفاصيل.</p></div><button class="btn btn-outline" data-jump="projects">عرض الكل</button></div><div class="admin-project-grid">${projectCards(recentProjects)}</div></section>
      <section class="admin-grid-2 admin-bottom-widgets">
        <div class="admin-panel"><div class="admin-panel-head"><div><h2>آخر النشاطات</h2><p>آخر عمليات الإدارة المسجلة.</p></div><button class="btn btn-outline" data-jump="logs">عرض الكل</button></div>${logsList(logs)}</div>
        <div class="admin-panel admin-chart-panel"><div class="admin-panel-head"><div><h2>إحصائيات سريعة</h2><p>مبنية من الأعمدة المتوفرة في Supabase.</p></div></div><div class="admin-bars">
          ${bar('المشاهدات', totalViews, Math.max(totalViews, totalContacts, 1))}
          ${bar('طلبات التواصل', totalContacts, Math.max(totalViews, totalContacts, 1))}
          ${bar('نسبة التحويل', conversion, 100, '%')}
          ${bar('المشاريع الموثقة', verified, Math.max(projects,1))}
        </div></div>
      </section>`);
    $$('[data-jump]').forEach(b => b.onclick = () => $(`[data-admin-section="${b.dataset.jump}"]`)?.click());
  }
  function kpi(icon,title,value,sub){ return `<article class="admin-kpi"><i>${icon}</i><span>${esc(title)}</span><b>${esc(value)}</b><small>${esc(sub)}</small></article>`; }
  function bar(label,value,max,suffix=''){ const pct = Math.max(2, Math.min(100, Math.round((Number(value||0)/Number(max||1))*100))); return `<div class="admin-bar-row"><div><b>${esc(label)}</b><span>${esc(value)}${suffix}</span></div><i><em style="width:${pct}%"></em></i></div>`; }
  function logsList(rows){ return rows?.length ? `<div class="activity-list">${rows.map(l=>`<article class="admin-log-row"><i></i><div><b>${esc(actionLabel(l.action))}</b><p>${esc(l.target_table || '')} ${esc(shortId(l.target_id))}</p><small>${fmtDate(l.created_at)}</small></div></article>`).join('')}</div>` : '<div class="empty-state">لا يوجد نشاط بعد.</div>'; }
  function actionLabel(a){ const m = { project_approved:'قبول مشروع', project_rejected:'رفض مشروع', project_needs_revision:'طلب تعديل مشروع', project_verification_verified:'توثيق مشروع', project_verification_rejected:'رفض توثيق مشروع', edit_user_full:'تعديل مستخدم', block_user:'حظر مستخدم', unblock_user:'فك حظر مستخدم', create_plan:'إنشاء باقة', edit_plan:'تعديل باقة', delete_plan:'حذف باقة' }; return m[a] || a || '-'; }

  async function renderProjects(){
    setTitle('إدارة المشاريع', 'مراجعة المشاريع بكروت حديثة مع فلاتر وملف تفصيلي لكل مشروع.');
    const status = sessionStorage.getItem('admin_project_filter') || adminState.projectFilter || 'all';
    const search = sessionStorage.getItem('admin_project_search') || adminState.projectSearch || '';
    let q = window.supabaseClient.from('projects').select('*').order('created_at', { ascending:false }).limit(200);
    if (status !== 'all') q = q.eq(status === 'verified' ? 'verification_status' : 'status', status);
    if (search) q = q.or(`title.ilike.%${search}%,category.ilike.%${search}%,location.ilike.%${search}%,description.ilike.%${search}%`);
    const { data, error } = await q; if (error) throw error;
    content(`<div class="admin-panel admin-toolbar-panel"><div class="admin-panel-head"><div><h2>المشاريع</h2><p>${data?.length || 0} نتيجة.</p></div><a class="btn btn-green" href="add-project.html">إضافة مشروع</a></div><form class="admin-filterbar" data-project-filter-form><input name="search" value="${esc(search)}" placeholder="بحث باسم المشروع، المجال، الموقع..."><select name="status"><option value="all">كل الحالات</option><option value="pending">قيد المراجعة</option><option value="approved">مقبول</option><option value="needs_revision">بحاجة تعديل</option><option value="rejected">مرفوض</option><option value="verified">مشاريع موثقة</option></select><button class="btn btn-outline">تطبيق</button><button class="btn btn-ghost" type="button" data-clear-project-filter>مسح</button></form></div><section class="admin-project-grid">${projectCards(data || [])}</section>`);
    const f = $('[data-project-filter-form]'); if (f) { f.status.value = status; f.addEventListener('submit', e=>{ e.preventDefault(); sessionStorage.setItem('admin_project_search', f.search.value.trim()); sessionStorage.setItem('admin_project_filter', f.status.value); renderProjects(); }); }
  }

  function projectCards(rows){
    if (!rows?.length) return '<div class="empty-state">لا توجد مشاريع مطابقة.</div>';
    return rows.map(p => {
      const img = p.image_url || p.cover_image || p.cover_url || '';
      const views = Number(p.views_count || p.views || 0); const contacts = Number(p.contacts_count || 0); const saves = Number(p.saves_count || 0);
      return `<article class="admin-project-card" data-project-card="${esc(p.id)}" data-review-revision="${Number(p.review_revision||0)}">
        <div class="admin-project-cover">${img ? `<img src="${esc(img)}" alt="">` : '<span>💼</span>'}${projectVerificationBadge(p)}<button class="admin-project-menu" type="button" data-review-project="${esc(p.id)}">⋮</button></div>
        <div class="admin-project-body"><div class="admin-project-title"><h3>${esc(p.title || 'مشروع بدون اسم')}</h3>${statusLabel(p.status || 'pending')}</div><p>${esc((p.description || '').slice(0,130))}${(p.description||'').length>130?'...':''}</p>
        <div class="admin-project-meta"><span>📍 ${esc(p.location || '-')}</span><span>🏷 ${esc(p.category || '-')}</span><span>💰 ${money(p.price)}</span></div>
        <div class="admin-project-stats"><b>👁 ${views}</b><b>🤝 ${contacts}</b><b>🔖 ${saves}</b></div>
        <div class="admin-card-actions"><button class="admin-primary-action" data-review-project="${esc(p.id)}">مراجعة الملف</button></div></div>
      </article>`;
    }).join('');
  }

  async function openProjectReview(id){
    const drawer = $('#adminReviewDrawer'); const backdrop = $('.admin-drawer-backdrop'); if (!drawer) return;
    drawer.innerHTML = '<div class="admin-drawer-loading">جاري تحميل ملف المشروع...</div>'; drawer.classList.add('open'); backdrop?.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    try {
      const { data:p, error } = await window.supabaseClient.from('projects').select('*').eq('id', id).maybeSingle(); if (error) throw error; if (!p) throw new Error('المشروع غير موجود');
      const [owner, images, docs, contacts] = await Promise.all([loadProjectOwner(p), loadProjectImages(p), loadProjectDocs(p), loadProjectContacts(p)]);
      drawer.innerHTML = projectReviewHtml(p, owner, images, docs, contacts);
    } catch(e){ console.error(e); drawer.innerHTML = `<div class="admin-drawer-error"><b>تعذر تحميل المشروع</b><p>${esc(e.message || e)}</p><button class="btn btn-outline" data-drawer-close>إغلاق</button></div>`; }
  }
  async function loadProjectOwner(p){const r=await window.supabaseClient.rpc('admin_project_owner_v76',{project_key:p.id});if(r.error)throw r.error;return r.data;}
  async function loadProjectImages(p){ try { const { data } = await window.supabaseClient.from('project_images').select('*').eq('project_id', p.id).order('sort_order', {ascending:true}); const rows = data || []; if (!rows.length && p.image_url) return [{ image_url:p.image_url }]; return rows; } catch { return p.image_url ? [{ image_url:p.image_url }] : []; } }
  async function loadProjectDocs(p){ try { const { data } = await window.supabaseClient.from('verification_files').select('*').eq('project_id', p.id).eq('target_type','project').order('created_at', {ascending:false}); return data || []; } catch { return []; } }
  async function loadProjectContacts(p){ try { const { count } = await window.supabaseClient.from('investor_contacted_projects').select('id', {count:'exact', head:true}).eq('project_id', p.id); return count || 0; } catch { return Number(p.contacts_count || 0); } }

  function filePreview(doc){ const url = doc.file_url || doc.url || doc.path || ''; const type = String(doc.file_type || doc.mime_type || '').toLowerCase(); const isImg = type.includes('image') || /\.(png|jpe?g|webp|gif)$/i.test(url); return `<article class="admin-doc-card" data-doc-key="${esc(doc.id)}" data-review-revision="${Number(doc.review_revision||0)}"><div class="admin-doc-preview">${url ? (isImg ? `<img src="${esc(url)}" alt="">` : '<span>📄</span>') : '<span>📎</span>'}</div><div><h4>${esc(doc.file_name || doc.document_type || 'مستند تحقق')}</h4><p>${esc(doc.file_type || 'document')} • ${fmtDate(doc.created_at)}</p>${statusLabel(doc.status || 'pending')}<div class="admin-doc-actions">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">فتح الملف</a>` : ''}</div></div></article>`; }
  function projectReviewHtml(p, owner, images, docs, contacts){
    const note = p.verification_note || p.admin_note || '';
    return `<div class="admin-drawer-head"><div><span>Project Review</span><h2>${esc(p.title || 'مشروع')}</h2><p>${esc(p.category || '-')} • ${esc(p.location || '-')} • ${money(p.price)}</p></div><button class="admin-drawer-close" data-drawer-close>×</button></div>
      <div class="admin-drawer-tabs"><button class="active" data-drawer-tab="summary">الملخص</button><button data-drawer-tab="docs">مستندات التوثيق <b>${docs.length}</b></button><button data-drawer-tab="owner">صاحب المشروع</button><button data-drawer-tab="actions">القرار</button></div>
      <section class="admin-drawer-section" data-tab-panel="summary"><div class="admin-gallery-strip">${images.length ? images.map(img=>`<img src="${esc(img.image_url || img.url || img.file_url)}" alt="">`).join('') : '<div class="empty-state">لا توجد صور للمشروع</div>'}</div><div class="admin-detail-grid"><div><label>حالة النشر</label>${statusLabel(p.status)}</div><div><label>حالة التوثيق</label>${projectVerificationBadge(p)}</div><div><label>المشاهدات</label><b>${esc(p.views_count || p.views || 0)}</b></div><div><label>طلبات التواصل</label><b>${contacts}</b></div><div><label>الأرباح الشهرية</label><b>${money(p.monthly_profit)}</b></div><div><label>المخاطرة</label><b>${esc(p.risk_level || p.risk || '-')}</b></div></div><div class="admin-read-box"><h3>وصف المشروع</h3><p>${esc(p.description || 'لا يوجد وصف.')}</p></div></section>
      <section class="admin-drawer-section is-hidden" data-tab-panel="docs"><div class="admin-section-note"><b>مستندات تحقق المشروع</b><p>راجع السجل التجاري/الرخص/العقود قبل منح شارة مشروع موثّق.</p></div><div class="admin-doc-grid">${docs.length ? docs.map(filePreview).join('') : '<div class="empty-state"><b>لا توجد مستندات مرفوعة</b><p>يمكن طلب تعديل من صاحب المشروع لرفع المستندات المطلوبة.</p></div>'}</div></section>
      <section class="admin-drawer-section is-hidden" data-tab-panel="owner"><div class="admin-owner-card"><h3>${esc(owner?.name || 'صاحب المشروع غير معروف')}</h3><p>${esc(accountLabel(owner?.account_type))} • ${userStatusLabel(owner || {})}</p><div class="admin-detail-grid"><div><label>الهاتف</label><b>${esc(owner?.phone || '-')}</b></div><div><label>واتساب</label><b>${esc(owner?.whatsapp || '-')}</b></div><div><label>الباقة</label><b>${esc(owner?.plan || owner?.subscription_status || 'free')}</b></div><div><label>توثيق الحساب</label>${statusLabel(owner?.verification_status || 'not_verified')}</div></div></div></section>
      <section class="admin-drawer-section is-hidden" data-tab-panel="actions"><form class="admin-review-form" data-project-review-form data-id="${esc(p.id)}" data-review-revision="${Number(p.review_revision||0)}"><label>قرار المشروع</label><select name="status"><option value="pending">قيد المراجعة</option><option value="approved">قبول المشروع</option><option value="needs_revision">طلب تعديل</option><option value="rejected">رفض المشروع</option></select><p>التوثيق يُحدّد من مراجعة المستندات الحالية بواسطة موظف التوثيق المخول.</p><label>ملاحظة الإدارة</label><textarea name="admin_note" placeholder="اكتب سبب الرفض أو التعديل أو ملاحظة التوثيق...">${esc(note)}</textarea><div class="admin-actions"><button class="btn btn-green">حفظ القرار</button><button type="button" class="btn btn-outline" data-project-status="approved" data-id="${esc(p.id)}">قبول سريع</button><button type="button" class="btn btn-outline" data-project-status="needs_revision" data-id="${esc(p.id)}">طلب تعديل</button><button type="button" class="btn btn-danger" data-project-status="rejected" data-id="${esc(p.id)}">رفض</button></div></form></section>`;
  }

  async function saveProjectReview(e){
    e.preventDefault();const f=e.currentTarget;if(f.dataset.saving==='1')return;f.dataset.saving='1';
    try{await window.AloReview.reviewProject(f.dataset.id,f.querySelector('[name=status]').value,f.querySelector('[name=admin_note]').value,Number(f.dataset.reviewRevision));toast('تم حفظ قرار النشر وسجل المراجعة');closeDrawer();renderProjects();}
    catch(err){alert(err.message||'تعذر حفظ القرار');}finally{f.dataset.saving='0';}
  }

  function verificationStatusText(s){
    const val = String(s || 'pending');
    const map = {
      pending:'قيد المراجعة', under_review:'تحت المراجعة', verified:'مقبول', approved:'مقبول', rejected:'مرفوض',
      needs_documents:'مطلوب ملفات إضافية', needs_revision:'مطلوب تعديل', suspicious:'اشتباه', expired:'منتهي'
    };
    return map[val] || val;
  }
  function computeRiskScore(doc, user, project){
    let score = 10;
    const reasons = [];
    if (!user?.name) { score += 20; reasons.push('بيانات المستخدم ناقصة'); }
    if (!user?.phone && !user?.whatsapp) { score += 15; reasons.push('لا يوجد رقم تواصل واضح'); }
    if (doc?.status === 'rejected' || doc?.status === 'suspicious') { score += 25; reasons.push('ملف عليه ملاحظة سابقة'); }
    if (doc?.target_type === 'project' && !project) { score += 25; reasons.push('الملف غير مرتبط بمشروع واضح'); }
    if (!doc?.file_url) { score += 20; reasons.push('رابط الملف غير موجود'); }
    if (String(doc?.file_name || '').toLowerCase().includes('receipt')) { score += 5; reasons.push('نوع الملف يحتاج مطابقة يدوية'); }
    score = Math.min(100, score);
    const level = score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low';
    return { score, level, reasons };
  }
  async function notifyUser(userAuthId, title, message, type='verification'){
    if (!userAuthId) return;
    try { await window.supabaseClient.from('notifications').insert({ user_auth_id:userAuthId, title, message, type, created_by:adminState.user?.id }); } catch(e){ console.warn('notify failed', e); }
  }

  async function renderVerification(){
    setTitle('مركز التوثيق', 'Workflow كامل: بيانات صاحب الطلب، الملفات، المخاطر، الملاحظات، القرارات، والسجل.');
    const filter = sessionStorage.getItem('admin_verification_filter') || 'all';
    const search = sessionStorage.getItem('admin_verification_search') || '';
    let docs = (await tableExistsSelect('verification_files', '*', 300) || []).filter(d=>d.is_current!==false);

    const projectIds = [...new Set(docs.filter(d=>d.project_id).map(d=>d.project_id))];
    let projectMap = new Map();
    if (projectIds.length) {
      try { const { data } = await window.supabaseClient.from('projects').select('*').in('id', projectIds); (data||[]).forEach(p=>projectMap.set(p.id,p)); } catch(e){}
    }

    const authIds = new Set();
    docs.forEach(d=>{ if (d.owner_auth_id) authIds.add(d.owner_auth_id); if (d.investor_auth_id) authIds.add(d.investor_auth_id); if (d.user_auth_id) authIds.add(d.user_auth_id); });
    projectMap.forEach(p=>{ const ownerId = p.owner_auth_id || p.user_id || p.created_by || p.user_auth_id; if (ownerId) authIds.add(ownerId); });

    let userMap = new Map();
    if (authIds.size) {
      try {
        const { data } = await window.supabaseClient
          .from('users')
          .select('auth_id,name,email,phone,whatsapp,account_type,verification_status,budget_min,budget_max,preferred_categories,preferred_location,investor_preferences,plan,subscription_status,is_blocked,admin_note')
          .in('auth_id', [...authIds]);
        (data||[]).forEach(u=>userMap.set(u.auth_id,u));
      } catch(e){}
    }

    let rows = docs.map(d => {
      const p = projectMap.get(d.project_id);
      const ownerId = d.owner_auth_id || d.investor_auth_id || d.user_auth_id || p?.owner_auth_id || p?.user_id || p?.created_by || p?.user_auth_id || '';
      const u = userMap.get(ownerId) || null;
      return { doc:d, project:p, user:u, risk:computeRiskScore(d,u,p) };
    });
    if (filter !== 'all') rows = rows.filter(x => String(x.doc.target_type || 'investor') === filter || String(x.doc.status || 'pending') === filter);
    if (search) {
      const needle = search.toLowerCase();
      rows = rows.filter(x => [x.doc.file_name, x.doc.document_type, x.user?.name, x.user?.phone, x.user?.whatsapp, x.project?.title].some(v => String(v||'').toLowerCase().includes(needle)));
    }
    const counts = rows.reduce((a,x)=>{ const st=String(x.doc.status||'pending'); a[st]=(a[st]||0)+1; return a; },{});
    content(`
      <div class="admin-panel admin-toolbar-panel verification-control-head">
        <div class="admin-panel-head"><div><h2>طلبات التوثيق</h2><p>${rows.length} طلب ظاهر. افتح أي ملف لمقارنة بيانات صاحب الطلب مع المستند واتخاذ قرار واضح.</p></div></div>
        <div class="admin-mini-stats">
          <span>قيد المراجعة <b>${counts.pending || 0}</b></span><span>تحت المراجعة <b>${counts.under_review || 0}</b></span><span>مقبول <b>${(counts.verified||0)+(counts.approved||0)}</b></span><span>مرفوض <b>${counts.rejected || 0}</b></span><span>مطلوب ملفات <b>${counts.needs_documents || 0}</b></span><span>اشتباه <b>${counts.suspicious || 0}</b></span>
        </div>
        <form class="admin-filterbar" data-verification-filter-form>
          <input name="search" value="${esc(search)}" placeholder="بحث بالاسم، الهاتف، المشروع، نوع الملف...">
          <select name="filter"><option value="all">كل الملفات</option><option value="project">توثيق مشاريع</option><option value="investor">توثيق مستثمرين</option><option value="pending">قيد المراجعة</option><option value="under_review">تحت المراجعة</option><option value="verified">مقبول</option><option value="rejected">مرفوض</option><option value="needs_documents">مطلوب ملفات</option><option value="suspicious">اشتباه</option><option value="expired">منتهي</option></select>
          <button class="btn btn-outline">تطبيق</button><button type="button" class="btn btn-ghost" data-clear-verification-filter>مسح</button>
        </form>
      </div>
      <section class="admin-doc-grid admin-verification-grid verification-suite-grid">${rows.length ? rows.map(x=>verificationDocCard(x.doc, x.project, x.user, x.risk)).join('') : '<div class="empty-state">لا توجد ملفات مطابقة للبحث أو الفلتر.</div>'}</section>`);
    const f = $('[data-verification-filter-form]'); if (f) { f.filter.value = filter; f.addEventListener('submit', e=>{ e.preventDefault(); sessionStorage.setItem('admin_verification_filter', f.filter.value); sessionStorage.setItem('admin_verification_search', f.search.value.trim()); renderVerification(); }); }
  }

  function verificationDocCard(d, p, u, risk){
    const url = d.file_url || d.url || '';
    const cats = Array.isArray(u?.preferred_categories) ? u.preferred_categories.join('، ') : (u?.investor_preferences?.categories || u?.investor_preferences?.category || 'غير محددة');
    const budget = (u?.budget_min || u?.budget_max) ? `${Number(u?.budget_min || 0).toLocaleString('ar-OM')} - ${Number(u?.budget_max || 0).toLocaleString('ar-OM')} ر.ع` : 'غير محددة';
    const isImg = /\.(png|jpe?g|webp|gif)$/i.test(url) || String(d.file_type||'').includes('image');
    const riskClass = risk.level === 'high' ? 'red' : risk.level === 'medium' ? 'yellow' : 'green';
    return `<article class="admin-doc-card admin-verify-card admin-verify-rich-card verification-request-card" data-doc-key="${esc(d.id)}" data-review-revision="${Number(d.review_revision||0)}">
      <div class="admin-doc-preview compact-preview">${url ? (isImg ? `<img src="${esc(url)}" alt="">` : '<span>📄</span>') : '<span>📎</span>'}</div>
      <div class="admin-verify-main">
        <div class="admin-verify-title-row"><h4>${esc(d.file_name || d.document_type || 'ملف تحقق')}</h4>${statusLabel(d.status || 'pending')}</div>
        <p class="muted">${esc(d.target_type === 'project' ? 'توثيق مشروع' : 'توثيق مستثمر')}${p ? ' • '+esc(p.title || 'مشروع') : ''}</p>
        <div class="admin-verify-person verification-person-grid">
          <div><label>صاحب الطلب</label><b>${esc(u?.name || 'غير معروف')}</b></div>
          <div><label>نوع الحساب</label><b>${esc(accountLabel(u?.account_type || d.target_type))}</b></div>
          <div><label>الهاتف</label><b>${esc(u?.phone || '-')}</b></div>
          <div><label>واتساب</label><b>${esc(u?.whatsapp || u?.phone || '-')}</b></div>
          ${d.target_type === 'investor' ? `<div><label>الميزانية</label><b>${esc(budget)}</b></div><div><label>المجالات</label><b>${esc(cats || 'غير محددة')}</b></div>` : ''}
          ${p ? `<div><label>المشروع</label><b>${esc(p.title || '-')}</b></div><div><label>حالة المشروع</label><b>${esc(String(p.status || 'pending'))}</b></div>` : ''}
        </div>
        <div class="verification-risk-line"><span class="admin-badge ${riskClass}">Risk ${risk.score}%</span><small>${esc(risk.reasons[0] || 'لا توجد مؤشرات خطورة واضحة')}</small></div>
        <div class="admin-doc-actions">${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">فتح الملف</a>` : ''}${p ? `<button data-review-project="${esc(p.id)}">مراجعة المشروع</button>` : ''}<button data-open-verification="${esc(d.id)}" data-review-revision="${Number(d.review_revision||0)}">تفاصيل التوثيق</button><button data-doc-status="verified" data-id="${esc(d.id)}">قبول</button><button data-doc-status="needs_documents" data-id="${esc(d.id)}">طلب ملفات</button><button data-doc-status="rejected" data-id="${esc(d.id)}">رفض</button></div>
      </div>
    </article>`;
  }

  async function openVerificationReview(id){
    const drawer = $('#adminReviewDrawer'); const backdrop = $('.admin-drawer-backdrop'); if (!drawer) return;
    drawer.innerHTML = '<div class="admin-drawer-loading">جاري تحميل طلب التوثيق...</div>'; drawer.classList.add('open'); backdrop?.classList.add('open'); drawer.setAttribute('aria-hidden','false');
    try {
      const { data:d, error } = await window.supabaseClient.from('verification_files').select('*').eq('id', id).maybeSingle(); if (error) throw error; if (!d) throw new Error('طلب التوثيق غير موجود');
      let p=null, u=null;
      if (d.project_id) { try { const r=await window.supabaseClient.from('projects').select('*').eq('id', d.project_id).maybeSingle(); p=r.data; } catch(e){} }
      const ownerId = d.owner_auth_id || d.investor_auth_id || d.user_auth_id || p?.owner_auth_id || p?.user_id || p?.created_by || p?.user_auth_id;
      if (ownerId) { try { const r=await window.supabaseClient.from('users').select('*').eq('auth_id', ownerId).maybeSingle(); u=r.data; } catch(e){} }
      let logs=[]; try { const r=await window.supabaseClient.from('admin_activity_logs').select('*').eq('target_id', id).order('created_at', {ascending:false}).limit(30); logs=r.data||[]; } catch(e){}
      const risk=computeRiskScore(d,u,p);
      drawer.innerHTML = verificationReviewHtml(d,p,u,risk,logs);
    } catch(e){ drawer.innerHTML = `<div class="admin-drawer-error"><b>تعذر تحميل طلب التوثيق</b><p>${esc(e.message || e)}</p><button class="btn btn-outline" data-drawer-close>إغلاق</button></div>`; }
  }

  function verificationReviewHtml(d,p,u,risk,logs){
    const url = d.file_url || d.url || '';
    const isImg = /\.(png|jpe?g|webp|gif)$/i.test(url) || String(d.file_type||'').includes('image');
    const riskClass = risk.level === 'high' ? 'red' : risk.level === 'medium' ? 'yellow' : 'green';
    return `<div class="admin-drawer-head"><div><span>Verification Review</span><h2>${esc(d.file_name || d.document_type || 'طلب توثيق')}</h2><p>${esc(verificationStatusText(d.status))} • ${fmtDate(d.created_at)}</p></div><button class="admin-drawer-close" data-drawer-close>×</button></div>
      <div class="admin-drawer-tabs"><button class="active" data-drawer-tab="summary">البيانات</button><button data-drawer-tab="file">الملف</button><button data-drawer-tab="decision">القرار</button><button data-drawer-tab="timeline">السجل <b>${logs.length}</b></button></div>
      <section class="admin-drawer-section" data-tab-panel="summary"><div class="verification-risk-box ${riskClass}"><b>Risk Score: ${risk.score}%</b><p>${risk.reasons.length ? risk.reasons.map(esc).join(' • ') : 'لا توجد مؤشرات خطورة واضحة'}</p></div><div class="admin-detail-grid"><div><label>صاحب الطلب</label><b>${esc(u?.name || 'غير معروف')}</b></div><div><label>نوع الحساب</label><b>${esc(accountLabel(u?.account_type || d.target_type))}</b></div><div><label>الهاتف</label><b>${esc(u?.phone || '-')}</b></div><div><label>واتساب</label><b>${esc(u?.whatsapp || u?.phone || '-')}</b></div><div><label>حالة الحساب</label>${userStatusLabel(u || {})}</div><div><label>توثيق الحساب</label>${statusLabel(u?.verification_status || 'not_verified')}</div>${p ? `<div><label>المشروع</label><b>${esc(p.title || '-')}</b></div><div><label>حالة المشروع</label>${statusLabel(p.status || 'pending')}</div>` : ''}</div></section>
      <section class="admin-drawer-section is-hidden" data-tab-panel="file"><div class="verification-file-large">${url ? (isImg ? `<img src="${esc(url)}" alt="">` : `<a class="file-open-large" href="${esc(url)}" target="_blank" rel="noopener">📄 فتح المستند</a>`) : '<div class="empty-state">لا يوجد رابط ملف</div>'}</div></section>
      <section class="admin-drawer-section is-hidden" data-tab-panel="decision"><form class="admin-review-form" data-verification-review-form data-doc-key="${esc(d.id)}" data-review-revision="${Number(d.review_revision||0)}" data-id="${esc(d.id)}" data-user-auth="${esc(u?.auth_id || '')}" data-project-id="${esc(p?.id || '')}"><label>حالة الطلب</label><select name="status"><option value="pending">قيد المراجعة</option><option value="under_review">تحت المراجعة</option><option value="verified">قبول التوثيق</option><option value="rejected">رفض</option><option value="needs_documents">طلب ملفات إضافية</option><option value="suspicious">اشتباه</option><option value="expired">منتهي</option></select><label>ملاحظة الإدارة</label><textarea name="admin_note" placeholder="مثال: الاسم غير مطابق / الصورة غير واضحة / مطلوب سجل تجاري أحدث...">${esc(d.admin_note || '')}</textarea><div class="admin-actions"><button class="btn btn-green">حفظ القرار</button><button type="button" class="btn btn-outline" data-doc-status="under_review" data-id="${esc(d.id)}">تحت المراجعة</button><button type="button" class="btn btn-outline" data-doc-status="needs_documents" data-id="${esc(d.id)}">طلب ملفات</button><button type="button" class="btn btn-danger" data-doc-status="rejected" data-id="${esc(d.id)}">رفض</button></div></form></section>
      <section class="admin-drawer-section is-hidden" data-tab-panel="timeline"><div class="admin-timeline">${logs.length ? logs.map(l=>`<div><b>${esc(l.action)}</b><span>${fmtDate(l.created_at)}</span><p>${esc(JSON.stringify(l.metadata || {})).slice(0,160)}</p></div>`).join('') : '<div class="empty-state">لا يوجد سجل مراجعة لهذا الطلب بعد.</div>'}</div></section>`;
  }

  async function saveVerificationReview(e){
    e.preventDefault(); const f=e.currentTarget; const id=f.dataset.id; const status=f.status.value; const note=f.admin_note.value.trim();
    const ok=await updateDocStatus(id,status,note,{expectedRevision:Number(f.dataset.reviewRevision),silent:true});
    if(ok){closeDrawer();renderVerification();}
  }

  async function updateDocStatus(id,status,note=null,opts={}){
    const ok=await window.AloReview.reviewDoc(id,status,note,opts.expectedRevision);
    if(ok&&!opts.silent)renderVerification();return ok;
  }

  async function renderUsers(){
    setTitle('إدارة المستخدمين', 'بحث وتعديل المستخدمين، الحظر، التعليق، وتفعيل الباقات.');
    const search = sessionStorage.getItem('admin_user_search') || '';
    let q = window.supabaseClient.from('users').select('*').order('created_at', { ascending:false }).limit(200);
    if (search) q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,whatsapp.ilike.%${search}%`);
    const { data, error } = await q; if (error) throw error;
    content(`<div class="admin-panel admin-toolbar-panel"><div class="admin-panel-head"><div><h2>المستخدمين</h2><p>${data?.length || 0} مستخدم ظاهر.</p></div></div><form class="admin-filterbar" data-user-search><input value="${esc(search)}" placeholder="بحث بالاسم، الإيميل، الهاتف..."><button class="btn btn-outline">بحث</button><button type="button" class="btn btn-ghost" data-clear-user-search>مسح</button></form></div><section class="admin-user-grid">${userCards(data || [])}</section>`);
    $('[data-user-search]')?.addEventListener('submit', e=>{ e.preventDefault(); sessionStorage.setItem('admin_user_search', e.currentTarget.querySelector('input').value.trim()); renderUsers(); });
  }
  function userCards(rows){ if (!rows.length) return '<div class="empty-state">لا يوجد مستخدمين.</div>'; return rows.map(u=>`<article class="admin-user-card"><div><h3>${esc(u.name || u.email || 'مستخدم')}</h3><p>${esc(u.phone || u.whatsapp || u.email || '')}</p></div><div class="admin-user-tags"><span>${esc(accountLabel(u.account_type))}</span>${userStatusLabel(u)}${statusLabel(u.subscription_status || u.plan || 'free')}</div><div class="admin-detail-grid compact"><div><label>رصيد النشر</label><b>${esc(u.remaining_projects ?? 0)}</b></div><div><label>التوثيق</label>${statusLabel(u.verification_status || 'not_verified')}</div></div><div class="admin-card-actions"><button class="admin-primary-action" data-user-edit data-auth="${esc(u.auth_id)}">تعديل</button><button class="admin-small-action" data-user-plan data-auth="${esc(u.auth_id)}">الباقة</button><button class="admin-small-action danger" data-user-block data-auth="${esc(u.auth_id)}" data-blocked="${u.is_blocked ? '1':'0'}">${u.is_blocked ? 'فك الحظر':'حظر'}</button></div></article>`).join(''); }

  async function renderStaff(){
    setTitle('حسابات الإدارة', 'إضافة العاملين وتحديد صلاحيات كل موظف.');
    let data = []; try { const res = await window.supabaseClient.from('admin_staff').select('*').order('created_at', { ascending:false }); if (res.error) throw res.error; data = res.data || []; } catch(e){ data = [adminState.staff]; }
    content(`<div class="admin-panel"><div class="admin-panel-head"><div><h2>إضافة موظف إدارة</h2><p>أدخل Auth ID للموظف من جدول users أو Auth.</p></div></div><form class="admin-form-grid" data-staff-form><div><label>Auth ID</label><input name="auth_id" required placeholder="UUID"></div><div><label>الاسم</label><input name="name" required></div><div><label>الإيميل</label><input name="email"></div><div><label>الدور</label><select name="role">${Object.entries(ROLE_LABELS).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></div><div class="span2"><label>صلاحيات مخصصة</label><div class="permission-tags">${Object.entries(ADMIN_PERMISSIONS).map(([k,v])=>`<label><input type="checkbox" name="permissions" value="${k}"> ${v}</label>`).join('')}</div></div><div class="span2"><button class="btn btn-green">حفظ الموظف</button></div></form></div><div class="admin-panel"><h2>فريق الإدارة</h2><div class="admin-staff-grid">${(data||[]).map(staffCard).join('')}</div></div>`);
    $('[data-staff-form]')?.addEventListener('submit', saveStaffForm);
  }
  function staffCard(s){ const perms = normalizePerms(s.permissions, s.role).map(p=>ADMIN_PERMISSIONS[p] || p).join('، '); return `<article class="admin-staff-card"><h3>${esc(s.name || '-')}</h3><p>${esc(s.email || s.auth_id || '')}</p><p><b>${esc(ROLE_LABELS[s.role] || s.role || '-')}</b></p><p>${esc(perms || '-')}</p></article>`; }

  async function renderPlans(){
    setTitle('إدارة الباقات', 'إنشاء، تعديل، حذف، وتفعيل الباقات التي تظهر للمستخدمين.');
    let plans = []; let tableReady = true; try { const res = await window.supabaseClient.from('admin_plans').select('*').order('sort_order', { ascending:true }); if (res.error) throw res.error; plans = res.data || []; } catch(e) { tableReady = false; plans = DEFAULT_PLANS; }
    content(`<div class="admin-panel"><div class="admin-panel-head"><div><h2>الباقات</h2><p>${tableReady ? 'مرتبطة بجدول admin_plans.' : 'جدول admin_plans غير موجود، تظهر باقات افتراضية مؤقتًا.'}</p></div><button class="btn btn-green" data-plan-new>إنشاء باقة</button></div><div class="admin-plans-grid">${plans.map(planCard).join('')}</div></div>`);
  }
  function planCard(p){ const features = featureList(p.features); return `<article class="admin-plan-card ${p.is_active === false ? 'muted':''}"><div class="admin-plan-top"><span>${esc(p.code || '-')}</span>${p.is_active === false ? statusLabel('blocked') : statusLabel('active')}</div><h3>${esc(p.name || p.code || '-')}</h3><strong>${money(p.price)}</strong><p>${esc(p.duration_days || 30)} يوم • ${esc(p.project_limit ?? 0)} مشروع</p><ul>${features.length ? features.map(f=>`<li>${esc(f)}</li>`).join('') : '<li>لا توجد ميزات مكتوبة</li>'}</ul><div class="admin-row-actions"><button class="admin-icon-btn" data-plan-edit="${esc(p.code)}">تعديل</button><button class="admin-icon-btn danger" data-plan-delete="${esc(p.code)}">حذف</button></div></article>`; }
  async function renderPayments(){
    setTitle('المدفوعات', 'مراجعة إيصالات الباقات وتفعيل الاشتراكات من مكان واحد.');
    let rows=[];
    try {
      const { data, error } = await window.supabaseClient.from('payment_requests').select('*').order('created_at', { ascending:false }).limit(120);
      if (error) throw error;
      rows = data || [];
    } catch(e) {
      content(`<div class="admin-locked"><b>جدول المدفوعات غير جاهز</b><p>${esc(e.message || e)}</p><p>شغّل ملف <b>supabase/v38-mvp-attachments-payments.sql</b> ثم حدّث الصفحة.</p></div>`);
      return;
    }
    const userIds=[...new Set(rows.map(r=>r.user_auth_id).filter(Boolean))];
    let userMap={};
    if(userIds.length){ try{ const { data } = await window.supabaseClient.from('users').select('auth_id,name,email,phone,whatsapp,plan,subscription_status').in('auth_id', userIds); userMap=Object.fromEntries((data||[]).map(u=>[u.auth_id,u])); }catch(e){} }
    const html = rows.length ? rows.map(r=>{
      const u=userMap[r.user_auth_id] || {};
      return `<article class="admin-payment-card">
        <div>
          <div class="admin-payment-top"><h3>${esc(String(r.plan || '').toUpperCase())} — ${money(r.amount_omr)}</h3>${statusLabel(r.status || 'pending')}</div>
          <p>${esc(u.name || u.email || shortId(r.user_auth_id))} • ${esc(u.phone || u.whatsapp || '-')}</p>
          <div class="admin-report-meta"><span>رصيد: ${esc(r.credits || 0)} مشاريع</span><span>مميز: ${esc(r.featured_projects || 0)}</span><span>مرجع: ${esc(r.payment_reference || '-')}</span><span>${fmtDate(r.created_at)}</span></div>
          ${r.note ? `<p class="muted">${esc(r.note)}</p>` : ''}
        </div>
        <div class="admin-report-actions">
          ${r.receipt_url ? `<a class="btn btn-outline" href="${esc(r.receipt_url)}" target="_blank" rel="noopener">فتح الإيصال</a>` : ''}
          <input type="text" class="admin-report-note-input" data-payment-note="${esc(r.id)}" placeholder="ملاحظة الإدارة..." value="${esc(r.admin_note || '')}">
          <button class="btn btn-green" data-payment-approve="${esc(r.id)}" ${r.status!=='pending'?'disabled':''}>قبول وتفعيل</button>
          <button class="btn btn-danger" data-payment-reject="${esc(r.id)}" ${r.status!=='pending'?'disabled':''}>رفض</button>
        </div>
      </article>`;
    }).join('') : '<div class="empty-state"><b>لا توجد طلبات دفع</b><p>طلبات شراء الباقات ستظهر هنا بعد رفع إيصال التحويل.</p></div>';
    content(`<section class="admin-panel"><div class="admin-panel-head"><div><h2>طلبات الدفع</h2><p>${rows.length} طلب ظاهر.</p></div><button class="btn btn-outline" data-admin-refresh>تحديث</button></div><div class="admin-moderation-list">${html}</div></section>`);
  }

  async function approvePaymentRequest(id){
    const noteEl=document.querySelector('[data-payment-note="'+id+'"]');
    const note=noteEl ? noteEl.value.trim() : null;
    const { error } = await window.supabaseClient.rpc('approve_payment_request', { request_id:id, admin_note_text:note || null });
    if(error) return alert('تعذر تفعيل الباقة: '+error.message);
    await logAdminAction('approve_payment_request','payment_requests',id,{ note });
    toast('تم تفعيل الباقة');
    renderPayments();
  }
  async function rejectPaymentRequest(id){
    const noteEl=document.querySelector('[data-payment-note="'+id+'"]');
    const note=(noteEl ? noteEl.value.trim() : '') || prompt('سبب رفض طلب الدفع:', 'الإيصال غير واضح أو التحويل غير مطابق');
    if(note === null) return;
    const { error } = await window.supabaseClient.rpc('reject_payment_request_v75',{request_id:id,reason:note});
    if(error) return alert('تعذر رفض الطلب: '+error.message);
    await logAdminAction('reject_payment_request','payment_requests',id,{ note });
    toast('تم رفض طلب الدفع');
    renderPayments();
  }
  async function renderNotifications(){ setTitle('الإشعارات', 'إرسال إشعارات للمستخدمين.'); content(`<div class="admin-panel"><h2>إرسال إشعار</h2><form class="admin-form-grid" data-notification-form><div><label>العنوان</label><input name="title" required></div><div><label>المستلم Auth ID</label><input name="user_auth_id" placeholder="اتركه فارغ للإشعار العام"></div><div class="span2"><label>الرسالة</label><textarea name="message" required></textarea></div><div class="span2"><button class="btn btn-green">إرسال</button></div></form></div>`); $('[data-notification-form]')?.addEventListener('submit', saveNotification); }

  async function renderChatModeration(){
    setTitle('بلاغات الشات', 'مراجعة المحادثات المبلغ عنها فقط مع سجل واضح للإجراءات.');
    let reports = [];
    try {
      const { data, error } = await window.supabaseClient
        .from('chat_reports')
        .select('*')
        .order('created_at', { ascending:false })
        .limit(100);
      if (error) throw error;
      reports = data || [];
    } catch(e) {
      content(`<div class="admin-locked"><b>جدول بلاغات الشات غير جاهز</b><p>${esc(e.message || e)}</p><p>شغّل ملف <b>supabase/v31-chat-moderation.sql</b> ثم حدّث الصفحة.</p></div>`);
      return;
    }
    const convIds = [...new Set(reports.map(r=>r.conversation_id).filter(Boolean))];
    const userIds = [...new Set(reports.flatMap(r=>[r.reporter_auth_id,r.reported_auth_id]).filter(Boolean))];
    let convMap = {}, userMap = {};
    if (convIds.length) {
      try { const { data } = await window.supabaseClient.from('chat_conversations').select('*').in('id', convIds); convMap = Object.fromEntries((data||[]).map(x=>[x.id,x])); } catch(e){}
    }
    if (userIds.length) {
      try { const { data } = await window.supabaseClient.from('users').select('auth_id,name,email,phone,whatsapp,account_type,is_blocked').in('auth_id', userIds); userMap = Object.fromEntries((data||[]).map(x=>[x.auth_id,x])); } catch(e){}
    }
    const html = reports.length ? reports.map(r=>{
      const conv = convMap[r.conversation_id] || {};
      const reporter = userMap[r.reporter_auth_id] || {};
      const reported = userMap[r.reported_auth_id] || {};
      const title = conv.project_snapshot?.title || 'محادثة مشروع';
      return `<article class="admin-report-card">
        <div>
          <h3>${esc(title)}</h3>
          <p>${esc(reasonLabel(r.reason))} — ${esc(r.note || 'لا توجد ملاحظات إضافية')}</p>
          <div class="admin-report-meta"><span>المبلّغ: ${esc(reporter.name || reporter.email || shortId(r.reporter_auth_id))}</span><span>ضد: ${esc(reported.name || reported.email || shortId(r.reported_auth_id))}</span><span>${statusLabel(r.status || 'open')}</span><span>${fmtDate(r.created_at)}</span></div>
          <div class="admin-chat-transcript" id="transcript-${esc(r.id)}" hidden></div>
        </div>
        <div class="admin-report-actions">
          <button class="btn btn-outline" data-load-transcript="${esc(r.conversation_id)}" data-target="${esc(r.id)}">عرض الرسائل</button>
          <input type="text" class="admin-report-note-input" data-note-for="${esc(r.id)}" placeholder="ملاحظة الإدارة (اختياري)..." value="${esc(r.admin_note || '')}">
          <button class="btn btn-outline" data-report-status="under_review" data-report-id="${esc(r.id)}">تحت المراجعة</button>
          <button class="btn btn-green" data-report-status="resolved" data-report-id="${esc(r.id)}">إغلاق</button>
          <button class="btn btn-danger" data-moderation-block="${esc(r.reported_auth_id)}" data-blocked="${reported.is_blocked ? '1' : '0'}">${reported.is_blocked ? 'رفع الحظر عن المبلّغ عنه' : 'حظر الطرف المبلّغ عنه'}</button>
        </div>
      </article>`;
    }).join('') : '<div class="empty-state"><b>لا توجد بلاغات حالياً</b><p>عند إبلاغ المستخدمين عن محادثة ستظهر هنا.</p></div>';
    content(`<section class="admin-panel"><div class="admin-panel-head"><div><h2>بلاغات الشات</h2><p>${reports.length} بلاغ ظاهر.</p></div><button class="btn btn-outline" data-admin-refresh>تحديث</button></div><div class="admin-moderation-list">${html}</div></section>`);
  }
  function reasonLabel(reason){ return { fraud:'احتيال أو نصب', spam:'سبام', abuse:'إساءة أو تهديد', outside_payment:'طلب دفع خارج المنصة', impersonation:'انتحال شخصية', other:'سبب آخر' }[reason] || reason || '-'; }
  async function updateReportStatus(id,status){ const noteEl = document.querySelector('[data-note-for="'+id+'"]'); const admin_note = noteEl ? noteEl.value.trim() || null : null; const { error } = await window.supabaseClient.from('chat_reports').update({ status, reviewed_by:adminState.user?.id, reviewed_at:new Date().toISOString(), ...(admin_note !== null && { admin_note }) }).eq('id', id); if(error) return alert('تعذر تحديث البلاغ: '+error.message); await logAdminAction('chat_report_'+status,'chat_reports',id,{ admin_note }); toast('تم تحديث البلاغ'); renderChatModeration(); }
  async function loadChatTranscript(conversationId,targetId){ const box = document.getElementById('transcript-'+targetId); if(!box) return; box.hidden = !box.hidden; if(box.dataset.loaded) return; box.innerHTML = '<div class="line">جاري تحميل الرسائل...</div>'; try{ const { data, error } = await window.supabaseClient.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at',{ascending:true}).limit(80); if(error) throw error; box.innerHTML = (data||[]).map(m=>`<div class="line"><b>${esc(shortId(m.sender_auth_id))} · ${fmtDate(m.created_at)}</b>${esc(m.body)}</div>`).join('') || '<div class="line">لا توجد رسائل.</div>'; box.dataset.loaded='1'; await logAdminAction('view_chat_transcript','chat_conversations',conversationId,{}); }catch(e){ box.innerHTML = `<div class="line">تعذر تحميل الرسائل: ${esc(e.message || e)}</div>`; } }

  async function renderLogs(){ setTitle('سجل النشاط', 'من فعل ماذا ومتى داخل الإدارة.'); let data=[]; try { const res = await window.supabaseClient.from('admin_activity_logs').select('*').order('created_at', { ascending:false }).limit(120); if(res.error) throw res.error; data=res.data||[]; } catch(e){ content('<div class="admin-panel"><h2>سجل النشاط</h2><p>جدول admin_activity_logs غير جاهز أو الصلاحيات ناقصة.</p></div>'); return; } content(`<div class="admin-panel"><div class="admin-panel-head"><div><h2>آخر العمليات</h2><p>${data.length} عملية.</p></div></div>${logsList(data)}</div>`); }

  async function saveStaffForm(e){ e.preventDefault(); const f=e.currentTarget; const permissions=[...f.querySelectorAll('input[name="permissions"]:checked')].map(i=>i.value); const payload={ auth_id:f.auth_id.value.trim(), name:f.name.value.trim(), email:f.email.value.trim() || null, role:f.role.value, permissions:permissions.length ? permissions : ROLE_PERMISSIONS[f.role.value], is_active:true }; const { error } = await window.supabaseClient.from('admin_staff').upsert(payload, { onConflict:'auth_id' }); if(error) return alert('تعذر حفظ الموظف: '+error.message); await logAdminAction('upsert_staff','admin_staff',payload.auth_id,{role:payload.role}); toast('تم حفظ الموظف'); renderStaff(); }
  async function saveNotification(e){ e.preventDefault(); const f=e.currentTarget; const payload={ title:f.title.value.trim(), message:f.message.value.trim(), user_auth_id:f.user_auth_id.value.trim() || null, created_by:adminState.user.id }; const { error } = await window.supabaseClient.from('notifications').insert(payload); if(error) return alert('تعذر إرسال الإشعار: '+error.message); await logAdminAction('send_notification','notifications',null,payload); toast('تم إرسال الإشعار'); f.reset(); }

  async function renderUserEditor(authId){
    setTitle('تعديل مستخدم', 'تعديل بيانات الحساب والباقة ونوع الحساب من صفحة داخلية.'); loading();
    const { data:u, error } = await window.supabaseClient.from('users').select('*').eq('auth_id', authId).maybeSingle(); if(error || !u){ content('<div class="admin-panel"><h2>تعذر قراءة بيانات المستخدم</h2></div>'); return; }
    let plans = DEFAULT_PLANS; try { const r = await window.supabaseClient.from('admin_plans').select('*').eq('is_active', true).order('sort_order',{ascending:true}); if(r.data?.length) plans = r.data; } catch(e){}
    content(`<div class="admin-panel admin-editor-panel"><div class="admin-panel-head"><div><h2>${esc(u.name || u.email || 'مستخدم')}</h2><p>${esc(u.email || '')}</p></div><button class="btn btn-outline" data-back-users>رجوع</button></div><form class="admin-form-grid" data-user-editor-form data-auth="${esc(authId)}"><div><label>الاسم</label><input name="name" value="${esc(u.name || '')}"></div><div><label>الهاتف</label><input name="phone" value="${esc(u.phone || '')}"></div><div><label>واتساب</label><input name="whatsapp" value="${esc(u.whatsapp || '')}"></div><div><label>نوع الحساب</label><select name="account_type"><option value="investor">مستثمر</option><option value="owner">صاحب مشروع</option><option value="both">مستثمر + صاحب مشروع</option></select></div><div><label>الباقة</label><select name="plan">${plans.map(p=>`<option value="${esc(p.code)}">${esc(p.name || p.code)} - ${money(p.price)}</option>`).join('')}</select></div><div><label>رصيد النشر</label><input name="remaining_projects" type="number" value="${esc(u.remaining_projects ?? 0)}"></div><div><label>حالة الاشتراك</label><select name="subscription_status"><option value="free">free</option><option value="active">active</option><option value="paid">paid</option><option value="premium">premium</option><option value="business">business</option></select></div><div><label>حالة الحساب</label><select name="account_status"><option value="active">نشط</option><option value="suspended">معلّق</option><option value="blocked">محظور</option></select></div><div class="span2"><label>ملاحظة الإدارة</label><textarea name="admin_note">${esc(u.admin_note || '')}</textarea></div><div class="span2 admin-actions"><button class="btn btn-green">حفظ التعديلات</button><button type="button" class="btn btn-outline" data-back-users>إلغاء</button></div></form></div>`);
    const f = $('[data-user-editor-form]'); f.account_type.value = String(u.account_type || 'investor'); f.plan.value = String(u.plan || u.subscription_status || 'free'); f.subscription_status.value = String(u.subscription_status || u.plan || 'free'); f.account_status.value = String(u.account_status || (u.is_blocked ? 'blocked' : 'active')); f.addEventListener('submit', saveUserEditor);
  }
  async function saveUserEditor(e){ e.preventDefault(); const f=e.currentTarget; const authId=f.dataset.auth; const status=f.account_status.value; const payload={ name:f.name.value.trim(), phone:f.phone.value.trim(), whatsapp:f.whatsapp.value.trim(), account_type:f.account_type.value, plan:f.plan.value, subscription_status:f.subscription_status.value, remaining_projects:Number(f.remaining_projects.value||0), account_status:status, is_blocked:status==='blocked', admin_note:f.admin_note.value.trim() || null }; const { error } = await window.supabaseClient.from('users').update(payload).eq('auth_id', authId); if(error) return alert('تعذر حفظ بيانات المستخدم: '+error.message); await logAdminAction('edit_user_full','users',authId,payload); toast('تم حفظ المستخدم'); renderUsers(); }

  async function renderPlanEditor(code){ setTitle(code ? 'تعديل باقة' : 'إنشاء باقة', 'إدارة بيانات الباقة من نموذج واضح.'); loading(); let current=null; if(code){ try { const r = await window.supabaseClient.from('admin_plans').select('*').eq('code', code).maybeSingle(); current=r.data; } catch(e){} } current = current || { code:'', name:'', price:0, duration_days:30, project_limit:1, features:[], is_active:true, sort_order:100 }; content(`<div class="admin-panel admin-editor-panel"><div class="admin-panel-head"><div><h2>${code ? 'تعديل الباقة' : 'باقة جديدة'}</h2><p>حدد السعر، عدد المشاريع، والميزات.</p></div><button class="btn btn-outline" data-back-plans>رجوع</button></div><form class="admin-form-grid" data-plan-editor-form data-original-code="${esc(code || '')}"><div><label>كود الباقة</label><input name="code" required value="${esc(current.code || '')}"></div><div><label>اسم الباقة</label><input name="name" required value="${esc(current.name || '')}"></div><div><label>السعر</label><input name="price" type="number" min="0" step="0.001" value="${esc(current.price ?? 0)}"></div><div><label>المدة بالأيام</label><input name="duration_days" type="number" min="1" value="${esc(current.duration_days ?? 30)}"></div><div><label>عدد المشاريع</label><input name="project_limit" type="number" min="0" value="${esc(current.project_limit ?? 1)}"></div><div><label>المشاريع المميزة</label><input name="featured_limit" type="number" min="0" value="${esc(current.featured_limit??0)}"></div><div class="span2"><label>بيانات التحويل المعتمدة (اتركها فارغة لتعطيل الشراء)</label><textarea name="payment_instructions">${esc(current.payment_instructions||'')}</textarea></div><div><label>ترتيب الظهور</label><input name="sort_order" type="number" value="${esc(current.sort_order ?? 100)}"></div><div><label>حالة الباقة</label><select name="is_active"><option value="true">فعالة</option><option value="false">معطلة</option></select></div><div class="span2"><label>الميزات، كل ميزة بسطر</label><textarea name="features">${esc(featureList(current.features).join('\n'))}</textarea></div><div class="span2 admin-actions"><button class="btn btn-green">حفظ الباقة</button><button type="button" class="btn btn-outline" data-back-plans>إلغاء</button></div></form></div>`); const f=$('[data-plan-editor-form]'); f.is_active.value=String(current.is_active !== false); f.addEventListener('submit', savePlanEditor); }
  async function savePlanEditor(e){ e.preventDefault(); const f=e.currentTarget; const payload={ featured_limit:Number(f.featured_limit.value||0),payment_instructions:f.payment_instructions.value.trim(),code:f.code.value.trim(), name:f.name.value.trim(), price:Number(f.price.value||0), duration_days:Number(f.duration_days.value||30), project_limit:Number(f.project_limit.value||0), sort_order:Number(f.sort_order.value||100), is_active:f.is_active.value==='true', features:f.features.value.split('\n').map(x=>x.trim()).filter(Boolean) }; const { error } = await window.supabaseClient.from('admin_plans').upsert(payload, { onConflict:'code' }); if(error) return alert('تعذر حفظ الباقة. تأكد من تشغيل SQL v17: '+error.message); await logAdminAction(f.dataset.originalCode ? 'edit_plan' : 'create_plan','admin_plans',payload.code,payload); toast('تم حفظ الباقة'); renderPlans(); }


  async function renderAds(){
    setTitle('إدارة الإعلانات', 'تحكم بالسلايدر والبنرات التي تظهر في الصفحة الرئيسية ومناطق المنصة.');
    loading();
    let ads = [];
    try {
      const { data, error } = await window.supabaseClient.from('platform_ads').select('*').order('sort_order', { ascending:true }).order('created_at', { ascending:false });
      if (error) throw error;
      ads = data || [];
    } catch (err) {
      content(`<div class="admin-locked"><b>جدول الإعلانات غير جاهز</b><p>شغّل ملف SQL: <b>supabase/v40-admin-ads-panel.sql</b> ثم ارجع حدث الصفحة.<br>${esc(err.message || err)}</p></div>`);
      return;
    }
    const active = ads.filter(a=>a.is_active).length;
    const expired = ads.filter(a=>a.ends_at && new Date(a.ends_at) < new Date()).length;
    content(`
      <section class="admin-kpi-grid admin-kpi-grid-pro admin-v20-kpis">
        ${kpi('📢','كل الإعلانات',ads.length,'Banner / Slider')}
        ${kpi('✅','فعّالة',active,'تظهر للمستخدمين')}
        ${kpi('⏳','منتهية',expired,'راجع تاريخ الانتهاء')}
        ${kpi('🏠','الرئيسية',ads.filter(a=>(a.placement||'home_top')==='home_top').length,'Hero / Home')}
      </section>
      <section class="admin-panel admin-ads-panel">
        <div class="admin-panel-head"><div><h2>الإعلانات</h2><p>أضف إعلان جديد أو عدّل الإعلانات الحالية. يظهر إعلان home_top في السلايدر الرئيسي.</p></div><button class="btn btn-green" data-ad-new>+ إعلان جديد</button></div>
        <div class="admin-ads-grid">
          ${ads.length ? ads.map(adCard).join('') : '<div class="admin-empty-state"><b>لا توجد إعلانات بعد</b><p>ابدأ بإضافة إعلان للسلايدر الرئيسي.</p><button class="btn btn-green" data-ad-new>إضافة إعلان</button></div>'}
        </div>
      </section>`);
  }

  function adCard(ad){
    const active = ad.is_active !== false;
    const expired = ad.ends_at && new Date(ad.ends_at) < new Date();
    return `<article class="admin-ad-card ${active?'':'is-off'} ${expired?'is-expired':''}">
      <div class="admin-ad-preview"><img src="${esc(ad.image_url || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80')}" alt=""><span>${esc(ad.placement || 'home_top')}</span></div>
      <div class="admin-ad-body"><div class="admin-ad-title"><b>${esc(ad.title || 'إعلان بدون عنوان')}</b>${statusLabel(active ? 'active' : 'suspended')}</div><p>${esc(ad.subtitle || 'بدون وصف')}</p><div class="admin-ad-meta"><span>ترتيب: ${esc(ad.sort_order ?? 0)}</span><span>ينتهي: ${fmtDate(ad.ends_at)}</span></div><div class="admin-actions"><button class="btn btn-outline" data-ad-edit="${esc(ad.id)}">تعديل</button><button class="btn btn-outline" data-ad-toggle="${esc(ad.id)}" data-active="${active?'1':'0'}">${active?'إيقاف':'تفعيل'}</button><button class="btn btn-danger" data-ad-delete="${esc(ad.id)}">حذف</button></div></div>
    </article>`;
  }

  async function renderAdEditor(id){
    setTitle(id ? 'تعديل إعلان' : 'إعلان جديد', 'ارفع/ضع رابط الصورة وحدد مكان ظهور الإعلان.');
    loading();
    let ad = null;
    if (id) {
      const { data, error } = await window.supabaseClient.from('platform_ads').select('*').eq('id', id).maybeSingle();
      if (error) return content(`<div class="admin-locked"><b>تعذر قراءة الإعلان</b><p>${esc(error.message)}</p></div>`);
      ad = data;
    }
    ad = ad || { title:'', subtitle:'', image_url:'', link_url:'', button_text:'', placement:'home_top', sort_order:1, is_active:true, starts_at:'', ends_at:'' };
    content(`<section class="admin-panel admin-editor-panel"><div class="admin-panel-head"><div><h2>${id ? 'تعديل الإعلان' : 'إضافة إعلان'}</h2><p>يفضل مقاس الصورة 1200×420 للسلايدر الرئيسي.</p></div><button class="btn btn-outline" data-back-ads>رجوع</button></div>
      <form class="admin-form-grid" data-ad-editor-form data-id="${esc(id || '')}">
        <div><label>عنوان الإعلان <small>اختياري</small></label><input name="title" value="${esc(ad.title || '')}" placeholder="اختياري: مثال باقة مميزة لأصحاب المشاريع"></div>
        <div><label>نص الزر <small>اختياري</small></label><input name="button_text" value="${esc(ad.button_text || '')}" placeholder="مثال: اعرف المزيد"></div>
        <div class="span2"><label>الوصف المختصر <small>اختياري</small></label><textarea name="subtitle" rows="3" placeholder="اختياري: وصف قصير يظهر فوق البنر">${esc(ad.subtitle || '')}</textarea></div>
        <div class="span2"><label>رابط الصورة</label><input name="image_url" value="${esc(ad.image_url || '')}" placeholder="https://..."></div>
        <div><label>رابط الانتقال</label><input name="link_url" value="${esc(ad.link_url || '')}" placeholder="plans.html أو https://..."></div>
        <div><label>مكان الظهور</label><select name="placement"><option value="home_top">الرئيسية - السلايدر العلوي</option><option value="home_middle">الرئيسية - وسط الصفحة</option><option value="opportunities_top">صفحة الفرص - أعلى النتائج</option><option value="project_details_mid">تفاصيل المشروع - وسط الصفحة</option><option value="project_sidebar">تفاصيل المشروع - جانب/داخل الصفحة</option><option value="plans_top">صفحة الباقات</option><option value="dashboard_top">لوحة المستخدم</option></select></div>
        <div><label>ترتيب الظهور</label><input name="sort_order" type="number" value="${esc(ad.sort_order ?? 1)}"></div>
        <div><label>الحالة</label><select name="is_active"><option value="true">فعال</option><option value="false">موقوف</option></select></div>
        <div><label>يبدأ في</label><input name="starts_at" type="datetime-local" value="${toLocalInput(ad.starts_at)}"></div>
        <div><label>ينتهي في</label><input name="ends_at" type="datetime-local" value="${toLocalInput(ad.ends_at)}"></div>
        <div class="span2 ad-live-preview"><b>معاينة سريعة</b><div class="admin-ad-preview-large"><img src="${esc(ad.image_url || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80')}" alt=""><div>${ad.title ? `<h3>${esc(ad.title)}</h3>` : ''}${ad.subtitle ? `<p>${esc(ad.subtitle)}</p>` : ''}${ad.button_text ? `<span>${esc(ad.button_text)}</span>` : ''}</div></div></div>
        <div class="span2 admin-actions"><button class="btn btn-green">حفظ الإعلان</button><button type="button" class="btn btn-outline" data-back-ads>إلغاء</button></div>
      </form></section>`);
    const f = $('[data-ad-editor-form]'); f.placement.value = ad.placement || 'home_top'; f.is_active.value = String(ad.is_active !== false); f.addEventListener('submit', saveAdEditor);
    f.image_url.addEventListener('input', ()=>{ const img=$('.admin-ad-preview-large img'); if(img && f.image_url.value.trim()) img.src=f.image_url.value.trim(); });
  }

  function toLocalInput(v){ if(!v) return ''; try{ const d=new Date(v); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); return d.toISOString().slice(0,16); }catch{return '';} }
  function fromLocalInput(v){ return v ? new Date(v).toISOString() : null; }

  async function saveAdEditor(e){
    e.preventDefault();
    const f=e.currentTarget; const id=f.dataset.id;
    const payload={ title:f.title.value.trim() || null, subtitle:f.subtitle.value.trim() || null, image_url:f.image_url.value.trim() || null, link_url:f.link_url.value.trim() || null, button_text:f.button_text.value.trim() || null, placement:f.placement.value, sort_order:Number(f.sort_order.value || 0), is_active:f.is_active.value === 'true', starts_at:fromLocalInput(f.starts_at.value), ends_at:fromLocalInput(f.ends_at.value) };
    const q = id ? window.supabaseClient.from('platform_ads').update(payload).eq('id', id) : window.supabaseClient.from('platform_ads').insert(payload);
    const { error } = await q;
    if(error) return alert('تعذر حفظ الإعلان. تأكد من تشغيل SQL v40: ' + error.message);
    await logAdminAction(id ? 'edit_ad' : 'create_ad', 'platform_ads', id || null, payload);
    toast('تم حفظ الإعلان'); renderAds();
  }

  async function toggleAd(id, isActive){
    const { error } = await window.supabaseClient.from('platform_ads').update({ is_active: !isActive }).eq('id', id);
    if(error) return alert('تعذر تغيير حالة الإعلان: '+error.message);
    await logAdminAction(!isActive ? 'activate_ad' : 'pause_ad', 'platform_ads', id, { is_active: !isActive });
    renderAds();
  }

  async function deleteAd(id){
    if(!confirm('حذف الإعلان نهائياً؟')) return;
    const { error } = await window.supabaseClient.from('platform_ads').delete().eq('id', id);
    if(error) return alert('تعذر حذف الإعلان: '+error.message);
    await logAdminAction('delete_ad', 'platform_ads', id, {});
    renderAds();
  }

  async function logAdminAction(action, target_table, target_id, metadata){ try { await window.supabaseClient.from('admin_activity_logs').insert({ admin_auth_id:adminState.user?.id, action, target_table, target_id, metadata:metadata || {} }); } catch(e){ console.warn('log failed', e); } }
  async function updateProjectStatus(id,status){
    const reason=['needs_revision','rejected'].includes(status)?prompt('سبب القرار (5 أحرف على الأقل):',''):'';if(reason===null)return;
    try{await window.AloReview.reviewProject(id,status,reason);toast('تم حفظ قرار النشر');closeDrawer();renderProjects();}catch(err){alert(err.message||'تعذر اتخاذ القرار');}
  }
  async function deleteProjectAdmin(id){ if(!confirm('حذف المشروع نهائياً؟')) return; const { error } = await window.supabaseClient.from('projects').delete().eq('id', id); if(error) return alert('تعذر الحذف: '+error.message); await logAdminAction('delete_project','projects',id,{}); renderProjects(); }
  async function toggleUserBlock(authId, isBlocked, onDone){ const next=!isBlocked; const reason = next ? prompt('سبب الحظر:', 'مخالفة شروط المنصة') : ''; if(next && reason === null) return; const payload={ is_blocked:next, account_status:next?'blocked':'active', block_reason:next?reason:null }; const { error } = await window.supabaseClient.from('users').update(payload).eq('auth_id', authId); if(error) return alert('تعذر تحديث حالة الحساب: '+error.message); await logAdminAction(next?'block_user':'unblock_user','users',authId,payload); if(typeof onDone === 'function') onDone(); else renderUsers(); }
  async function deletePlan(code){ if(!confirm('حذف الباقة؟ لن يحذف اشتراكات المستخدمين الحالية.')) return; const { error } = await window.supabaseClient.from('admin_plans').delete().eq('code', code); if(error) return alert('تعذر حذف الباقة: '+error.message); await logAdminAction('delete_plan','admin_plans',code,{}); renderPlans(); }
  function closeDrawer(){ $('#adminReviewDrawer')?.classList.remove('open'); $('.admin-drawer-backdrop')?.classList.remove('open'); $('#adminReviewDrawer')?.setAttribute('aria-hidden','true'); }

  async function initAdminDashboard(){ const root=$('[data-admin-dashboard]'); if(!root) return; if(!window.supabaseClient) initSupabase?.(); const ctx=await getAdminContext(); if(!ctx.allowed){ root.innerHTML=`<div class="admin-locked"><b>غير مصرح بالدخول</b><p>${esc(ctx.reason)}</p><div class="admin-actions" style="justify-content:center;margin-top:14px"><a class="btn btn-green" href="login.html">تسجيل الدخول</a><a class="btn btn-outline" href="index.html">العودة للرئيسية</a></div></div>`; return; } adminState={...adminState,...ctx,section:'overview'}; renderShell(); }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-drawer-close]')) return closeDrawer();
    const tab = e.target.closest('[data-drawer-tab]'); if(tab){ $$('[data-drawer-tab]').forEach(b=>b.classList.toggle('active', b===tab)); $$('[data-tab-panel]').forEach(p=>p.classList.toggle('is-hidden', p.dataset.tabPanel !== tab.dataset.drawerTab)); return; }
    const review = e.target.closest('[data-review-project]'); if(review) return openProjectReview(review.dataset.reviewProject);
    const ps = e.target.closest('[data-project-status]'); if(ps) return updateProjectStatus(ps.dataset.id, ps.dataset.projectStatus);
    const openV = e.target.closest('[data-open-verification]'); if(openV) return openVerificationReview(openV.dataset.openVerification);
    const doc = e.target.closest('[data-doc-status]'); if(doc){const node=doc.closest('[data-doc-key]');return updateDocStatus(doc.dataset.id,doc.dataset.docStatus,null,{expectedRevision:node?Number(node.dataset.reviewRevision):undefined});}
    if (e.target.closest('[data-clear-project-filter]')) { sessionStorage.removeItem('admin_project_search'); sessionStorage.removeItem('admin_project_filter'); return renderProjects(); }
    if (e.target.closest('[data-clear-user-search]')) { sessionStorage.removeItem('admin_user_search'); return renderUsers(); }
    if (e.target.closest('[data-clear-verification-filter]')) { sessionStorage.removeItem('admin_verification_filter'); sessionStorage.removeItem('admin_verification_search'); return renderVerification(); }
    if (e.target.closest('[data-back-users]')) return renderUsers();
    if (e.target.closest('[data-back-plans]')) return renderPlans();
    if (e.target.closest('[data-back-ads]')) return renderAds();
    const approvePayment = e.target.closest('[data-payment-approve]'); if (approvePayment) return approvePaymentRequest(approvePayment.dataset.paymentApprove);
    const rejectPayment = e.target.closest('[data-payment-reject]'); if (rejectPayment) return rejectPaymentRequest(rejectPayment.dataset.paymentReject);
    const ue=e.target.closest('[data-user-edit]'); if(ue) return renderUserEditor(ue.dataset.auth);
    const up=e.target.closest('[data-user-plan]'); if(up) return renderUserEditor(up.dataset.auth);
    const ub=e.target.closest('[data-user-block]'); if(ub) return toggleUserBlock(ub.dataset.auth, ub.dataset.blocked === '1');
    const an=e.target.closest('[data-ad-new]'); if(an) return renderAdEditor(null);
    const ae=e.target.closest('[data-ad-edit]'); if(ae) return renderAdEditor(ae.dataset.adEdit);
    const at=e.target.closest('[data-ad-toggle]'); if(at) return toggleAd(at.dataset.adToggle, at.dataset.active === '1');
    const ad=e.target.closest('[data-ad-delete]'); if(ad) return deleteAd(ad.dataset.adDelete);
    const pn=e.target.closest('[data-plan-new]'); if(pn) return renderPlanEditor(null);
    const pe=e.target.closest('[data-plan-edit]'); if(pe) return renderPlanEditor(pe.dataset.planEdit);
    const pd=e.target.closest('[data-plan-delete]'); if(pd) return deletePlan(pd.dataset.planDelete);
    const rs=e.target.closest('[data-report-status]'); if(rs) return updateReportStatus(rs.dataset.reportId, rs.dataset.reportStatus);
    const lt=e.target.closest('[data-load-transcript]'); if(lt) return loadChatTranscript(lt.dataset.loadTranscript, lt.dataset.target);
    const mb=e.target.closest('[data-moderation-block]'); if(mb){ const authId=mb.dataset.moderationBlock; const isBlocked = mb.dataset.blocked === '1'; return toggleUserBlock(authId, isBlocked, renderChatModeration); }
  });
  document.addEventListener('submit', e => { if (e.target.matches('[data-project-review-form]')) return saveProjectReview(e); if (e.target.matches('[data-verification-review-form]')) return saveVerificationReview(e); if (e.target.matches('[data-ad-editor-form]')) return saveAdEditor(e); });

  // Compatibility with older admin pages
  window.loadAdminDashboard = initAdminDashboard;
  window.ADMIN_PERMISSIONS = ADMIN_PERMISSIONS;
  window.ROLE_PERMISSIONS = ROLE_PERMISSIONS;
  window.approveProject = id => updateProjectStatus(id, 'approved');
  window.rejectProject = id => updateProjectStatus(id, 'rejected');
  window.returnProject = id => updateProjectStatus(id, 'needs_revision');
  window.deleteProject = id => deleteProjectAdmin(id);
  window.loadAdminProjects = async function(){ if ($('[data-admin-dashboard]')) return; const tbody=$('[data-admin-projects]'); if(!tbody) return; const { data, error } = await window.supabaseClient.from('projects').select('*').in('status',['pending','needs_revision']).order('created_at',{ascending:false}); if(error){ tbody.innerHTML='<tr><td colspan="6">حدث خطأ أثناء تحميل المشاريع</td></tr>'; return; } tbody.innerHTML=(data||[]).map(p=>`<tr><td>${esc(p.title||'-')}</td><td>${esc(p.location||'-')}</td><td>${money(p.price)}</td><td>${statusLabel(p.status)}</td><td><button class="btn btn-outline" data-review-project="${esc(p.id)}">مراجعة</button></td><td><button class="btn btn-green" onclick="approveProject('${esc(p.id)}')">قبول</button></td></tr>`).join('') || '<tr><td colspan="6">لا توجد مشاريع</td></tr>'; };
  window.loadAdminEditForm = async function(){};
})();
