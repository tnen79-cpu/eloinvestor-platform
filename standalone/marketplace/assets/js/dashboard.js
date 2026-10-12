// Dashboard SPA with role-based sidebar - v10 interactive
(function () {
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function normalizeAccountType(type) {
    const raw = String(type || '').trim();
    const t = raw.toLowerCase().replace(/[\s-]+/g, '_');
    if (['both','mixed','owner_investor','investor_owner','project_owner_investor'].includes(t) || (raw.includes('مستثمر') && raw.includes('صاحب'))) return 'both';
    if (['owner','project_owner','seller','business_owner','projectowner','صاحب_مشروع'].includes(t) || raw.includes('صاحب')) return 'owner';
    return 'investor';
  }
  function typeLabel(t) { t = normalizeAccountType(t); return t === 'owner' ? 'صاحب مشروع' : t === 'both' ? 'مستثمر وصاحب مشروع' : 'مستثمر'; }
  function statusLabel(s) { return ({approved:'مقبول', pending:'قيد المراجعة', rejected:'مرفوض', revision:'بحاجة تعديل', draft:'مسودة'}[s] || s || 'قيد المراجعة'); }
  function verificationLabel(s) { return ({verified:'موثق ✅', pending:'قيد المراجعة', rejected:'مرفوض', not_verified:'غير موثق'}[s] || 'غير موثق'); }
  function canOwner(t) { t = normalizeAccountType(t); return t === 'owner' || t === 'both'; }
  function canInvestor(t) { t = normalizeAccountType(t); return t === 'investor' || t === 'both'; }
  function money(v) { const n = Number(v || 0); return n ? n.toLocaleString('ar-OM') + ' ر.ع' : 'غير محدد'; }
  function isPremium(profile){
    const active=['active','paid'].includes(String(profile?.subscription_status||'').toLowerCase());
    const expiry=profile?.subscription_expires_at?Date.parse(profile.subscription_expires_at):null;
    return active&&String(profile?.plan||'free')!=='free'&&(expiry===null||expiry>Date.now());
  }
  function normText(v) { return String(v || '').toLowerCase().replace(/[أإآ]/g,'ا').replace(/[ة]/g,'ه').trim(); }
  function containsLoose(haystack, needle) { return normText(haystack).includes(normText(needle)); }

  function cacheKey(user) { return `alo_dashboard_profile_${user?.id || 'guest'}`; }
  function prefsKey(user) { return `alo_investor_preferences_${user?.id || 'guest'}`; }
  function savedKey(user) { return `alo_saved_projects_${user?.id || 'guest'}`; }
  function contactedKey(user) { return `alo_contacted_projects_${user?.id || 'guest'}`; }
  function notificationsKey(user) { return `alo_notifications_${user?.id || 'guest'}`; }
  function activityKey(user) { return `alo_activity_${user?.id || 'guest'}`; }
  function saveCache(user, profile) { try { sessionStorage.setItem(cacheKey(user), JSON.stringify({ auth_id: profile?.auth_id || user?.id || '', cached_at: Date.now() })); } catch {} }
  function readCache(user) { try { return JSON.parse(sessionStorage.getItem(cacheKey(user)) || 'null'); } catch { return null; } }
  function savePrefs(user, p) { try { localStorage.setItem(prefsKey(user), JSON.stringify(p)); } catch {} }
  function normalizePrefs(raw = {}) {
    const p = raw || {};
    let interests = p.interests || p.preferred_categories || p.categories || [];
    if (typeof interests === 'string') interests = interests.split(/[,،]/).map(x => x.trim()).filter(Boolean);
    return {
      budget_min: Number(p.budget_min || 0),
      budget_max: Number(p.budget_max || 0),
      interests: Array.isArray(interests) ? interests : [],
      preferred_location: p.preferred_location || '',
      opportunity_type: p.opportunity_type || ''
    };
  }
  function loadPrefs(user, profile) {
    try {
      const local = JSON.parse(localStorage.getItem(prefsKey(user)) || 'null');
      return normalizePrefs(local || profile?.investor_preferences || {
        budget_min: profile?.budget_min, budget_max: profile?.budget_max,
        preferred_location: profile?.preferred_location, interests: profile?.preferred_categories
      });
    } catch { return normalizePrefs(profile?.investor_preferences || {}); }
  }
  function readList(key) { try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; } }
  function writeList(key, list) { try { localStorage.setItem(key, JSON.stringify(list)); } catch {} }

  function safeProfile(user, profile) {
    const meta = user?.user_metadata || {};
    return {
      auth_id: profile?.auth_id || user?.id || '',
      name: profile?.name || meta.name || user?.email || 'مستخدم',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || meta.phone || '',
      whatsapp: profile?.whatsapp || meta.whatsapp || '',
      account_type: normalizeAccountType(profile?.account_type || meta.account_type || 'investor'),
      plan: profile?.plan || 'free',
      subscription_status: profile?.subscription_status || 'free',
      subscription_expires_at:profile?.subscription_expires_at||null,
      remaining_projects: profile?.remaining_projects ?? 0,
      verification_status: profile?.verification_status || profile?.investor_verification_status || 'not_verified',
      investor_preferences: profile?.investor_preferences || {},
      preferred_categories: profile?.preferred_categories || [],
      preferred_location: profile?.preferred_location || '',
      budget_min: profile?.budget_min || 0,
      budget_max: profile?.budget_max || 0
    };
  }

  async function waitForAuth(timeoutMs = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (typeof window.getSessionUser === 'function' && window.supabaseClient) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  }
  async function getCurrentSafe() {
    await waitForAuth();
    const user = await window.getSessionUser?.();
    if (!user) return { user: null, profile: null };
    let profile = null;
    try {
      if (typeof window.getUserProfile === 'function') {
        const fresh = await Promise.race([window.getUserProfile(), new Promise(resolve => setTimeout(() => resolve(null), 3000))]);
        if (fresh) { profile = safeProfile(user, fresh); saveCache(user, profile); }
      }
    } catch (e) { console.warn('profile fallback:', e); }
    if (!profile) profile = safeProfile(user, null);
    return { user, profile };
  }

  function setNav(type) { $$('[data-owner-nav]').forEach(el => el.style.display = canOwner(type) ? '' : 'none'); }

  function sidebarItems(type) {
    const items = [{ id:'overview', icon:'⌂', label:'نظرة عامة' }, { id:'chat', icon:'💬', label:'الشات الداخلي', href:'chat.html' }];
    if (canOwner(type)) items.push({ id:'my-projects', icon:'▦', label:'مشاريعي' }, { id:'add-project', icon:'+', label:'إضافة مشروع', href:'add-project.html' }, { id:'owner-analytics', icon:'📊', label:'الإحصائيات' }, { id:'owner-requests', icon:'🤝', label:'طلبات المستثمرين' }, { id:'plans', icon:'⭐', label:'الباقات', href:'plans.html' });
    if (canInvestor(type)) items.push({ id:'recommendations', icon:'🎯', label:'الفرص المقترحة' }, { id:'interests', icon:'⚙', label:'اهتماماتي' }, { id:'verification', icon:'♡', label:'التوثيق' }, { id:'saved', icon:'🔖', label:'المحفوظات' }, { id:'contacted', icon:'💬', label:'الاهتمامات المسجلة' });
    items.push({ id:'notifications', icon:'🔔', label:'الإشعارات' }, { id:'activity', icon:'🕘', label:'النشاط' }, { id:'profile', icon:'👤', label:'الملف الشخصي' });
    return items;
  }

  function layout(profile) {
    const type = normalizeAccountType(profile.account_type);
    const items = sidebarItems(type).map(i => i.href
      ? `<a class="dash-link" href="${i.href}"><span>${i.icon}</span><b>${i.label}</b></a>`
      : `<button class="dash-link" type="button" data-section-target="${i.id}"><span>${i.icon}</span><b>${i.label}</b></button>`).join('');
    return `<section class="dash-shell" data-dash-shell>
      <aside class="dash-sidebar">
        <div class="dash-brand"><div class="dash-avatar">👤</div><div><strong>${esc(profile.name)}</strong><span>${typeLabel(type)}</span></div></div>
        <nav class="dash-menu">${items}</nav>
        <a class="dash-upgrade" href="${canOwner(type) ? 'plans.html' : 'opportunities.html'}"><b>${canOwner(type) ? 'ترقية الباقة' : 'تصفح الفرص'}</b><span>${canOwner(type) ? 'انشر مشاريع أكثر' : 'اعثر على فرصة مناسبة'}</span></a>
      </aside>
      <div class="dash-main">
        <div class="dash-topbar"><button class="dash-mobile-toggle" type="button" data-open-sidebar>☰</button><div><h1 data-section-title>لوحة التحكم</h1><p>إدارة حسابك من مكان واحد.</p></div></div>
        <section class="ad-section ad-page-slot dashboard-ad-slot" data-ad-placement="dashboard_top"></section>
        <div class="dash-content" data-dash-content>${skeletonCards()}</div>
      </div>
    </section>`;
  }

  function skeletonCards() { return `<div class="dash-skeleton-grid"><i></i><i></i><i></i><i></i></div>`; }
  function kpi(label, value, hint='') { return `<div class="dash-kpi"><span>${label}</span><b>${value}</b>${hint ? `<small>${hint}</small>` : ''}</div>`; }
  function panel(title, desc, body, action='') { return `<section class="dash-panel"><div class="dash-panel-head"><div><h2>${title}</h2>${desc?`<p>${desc}</p>`:''}</div>${action}</div>${body}</section>`; }
  function soon(title, desc, action='') { return `<div class="dash-soon"><b>${title}</b><p>${desc}</p>${action || '<span>قريبًا</span>'}</div>`; }
  function showToast(msg) {
    let t = $('[data-dashboard-toast]');
    if (!t) { t = document.createElement('div'); t.setAttribute('data-dashboard-toast',''); t.className = 'dashboard-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show'); clearTimeout(t._timer); t._timer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function renderOverview(profile) {
    const type = normalizeAccountType(profile.account_type);
    let cards = kpi('نوع الحساب', typeLabel(type)) + kpi('الباقة الحالية', esc(profile.plan), isPremium(profile) ? 'مميزات متقدمة مفعلة' : 'مجانية');
    if (canOwner(type)) cards += kpi('رصيد النشر', esc(profile.remaining_projects), 'مشاريع متبقية');
    if (canInvestor(type)) cards += kpi('حالة التوثيق', verificationLabel(profile.verification_status), 'ثقة أعلى عند التواصل');
    let quick = '';
    if (canOwner(type)) quick += `<a class="btn btn-green" href="add-project.html">إضافة مشروع</a><button type="button" class="btn btn-outline" data-section-target="my-projects">مشاريعي</button>`;
    if (canInvestor(type)) quick += `<button type="button" class="btn btn-green" data-section-target="recommendations">فرصي المقترحة</button><button type="button" class="btn btn-outline" data-section-target="interests">تعديل الاهتمامات</button>`;
    return `<section class="dash-hero"><div><span>مرحباً بك</span><h2>${esc(profile.name)}</h2><p>${canOwner(type) && !canInvestor(type) ? 'تابع مشاريعك ورصيد النشر والباقات من لوحة واحدة.' : canInvestor(type) && !canOwner(type) ? 'تابع فرصك المقترحة وحدد اهتماماتك الاستثمارية.' : 'حسابك يجمع بين أدوات المستثمر وصاحب المشروع.'}</p></div><div class="dash-hero-actions">${quick}</div></section><section class="dash-kpi-grid">${cards}</section>`;
  }

  function projectCard(p) {
    const id = encodeURIComponent(p.id || '');
    const views = Number(p.views || p.view_count || 0);
    const contacts = Number(p.contacts_count || p.contact_count || 0);
    return `<article class="dashboard-project-card owner-project-card"><div><h3>${esc(p.title || 'مشروع بدون اسم')}</h3><p>${esc(p.category || p.sector || '')}${p.location ? ' • '+esc(p.location) : ''}</p><small>الحالة: ${esc(statusLabel(p.status))}${views ? ' • مشاهدات: '+views : ''}${contacts ? ' • تواصل: '+contacts : ''}</small></div><div class="project-card-actions"><b>${money(p.price || p.investment_amount || p.asking_price)}</b><a class="btn btn-outline" href="project-details.html?id=${id}">عرض</a><a class="btn btn-green" href="edit-my-project.html?id=${id}">تعديل</a><button type="button" class="btn btn-outline" data-section-target="owner-requests">طلبات المستثمرين</button></div></article>`;
  }

  async function queryOwnerProjects(user) {
    if (!window.supabaseClient || !user?.id) return [];
    const attempts = [
      q => q.eq('owner_auth_id', user.id),
      q => q.eq('user_id', user.id),
      q => q.eq('owner_id', user.id),
      q => q.eq('created_by', user.id),
      q => q.eq('email', user.email || ''),
      q => q.eq('owner_email', user.email || '')
    ];
    for (const filter of attempts) {
      try {
        let q = window.supabaseClient.from('projects').select('*').order('created_at', { ascending: false });
        const { data, error } = await filter(q);
        if (!error) return data || [];
      } catch {}
    }
    return [];
  }

  async function ownerProjectsSection(user) {
    setTimeout(() => loadOwnerProjects(user), 20);
    return panel('مشاريعي', 'المشاريع التي أضفتها تظهر هنا مع حالة الموافقة والتعديل.', `<div class="my-projects-list" data-my-projects>${skeletonCards()}</div>`, '<a class="btn btn-green" href="add-project.html">+ مشروع جديد</a>');
  }
  async function loadOwnerProjects(user) {
    const box = $('[data-my-projects]'); if (!box) return;
    try {
      const list = await queryOwnerProjects(user);
      if (!list.length) { box.innerHTML = '<div class="empty-state"><b>لا توجد مشاريع بعد</b><p>أضف أول مشروع ليظهر هنا.</p><a class="btn btn-green" href="add-project.html">إضافة مشروع</a></div>'; return; }
      box.innerHTML = list.map(projectCard).join('');
    } catch (err) { console.error(err); box.innerHTML = '<div class="empty-state">تعذر تحميل المشاريع. تأكد من صلاحيات Supabase.</div>'; }
  }

  function ownerAnalyticsSection() {
    setTimeout(async () => {
      const ctx = window.__dashboardCtx; if (!ctx) return;
      const list = await queryOwnerProjects(ctx.user);
      const total = list.length;
      const approved = list.filter(p => p.status === 'approved').length;
      const pending = list.filter(p => !p.status || p.status === 'pending').length;
      const rejected = list.filter(p => p.status === 'rejected').length;
      const grid = $('[data-owner-analytics-kpis]');
      if (grid) grid.innerHTML = kpi('كل المشاريع', total) + kpi('المقبولة', approved) + kpi('قيد المراجعة', pending) + kpi('المرفوضة', rejected);
    }, 30);
    return `<section class="dash-kpi-grid" data-owner-analytics-kpis>${skeletonCards()}</section>${panel('تحليلات المشاريع','هنا لاحقًا تظهر المشاهدات، التواصل، أفضل المشاريع أداءً، ومصدر المستثمرين.', `<div class="premium-grid"><div><b>تحليلات أساسية</b><strong>مفعّلة جزئيًا</strong><p>عدد المشاريع وحالاتها تظهر الآن.</p></div><div><b>تحليلات Premium</b><strong>قريبًا</strong><p>المشاهدات، جودة المستثمرين، واقتراحات تحسين العرض.</p><button type="button" class="btn btn-outline" data-soon-action="analytics">تفعيل لاحقًا</button></div></div>`)}`;
  }

  function preferencesForm(profile, user) {
    const prefs = loadPrefs(user, profile);
    const interests = Array.isArray(prefs.interests) ? prefs.interests.join('، ') : (prefs.interests || '');
    return `<form data-investor-preferences-form class="form-grid investor-pref-form" action="javascript:void(0)">
      <div class="group"><label>الميزانية من</label><input name="budget_min" type="number" min="0" value="${esc(prefs.budget_min || '')}" placeholder="مثال: 1000"></div>
      <div class="group"><label>الميزانية إلى</label><input name="budget_max" type="number" min="0" value="${esc(prefs.budget_max || '')}" placeholder="مثال: 10000"></div>
      <div class="group span2"><label>المجالات المهتم فيها</label><input name="interests" value="${esc(interests)}" placeholder="مطاعم، تقنية، تجارة، تجميل، عقارات"></div>
      <div class="group"><label>الموقع المفضل</label><input name="preferred_location" value="${esc(prefs.preferred_location || '')}" placeholder="مسقط، الخوض، صحار"></div>
      <div class="group"><label>نوع الفرصة</label><select name="opportunity_type"><option value="" ${!prefs.opportunity_type?'selected':''}>الكل</option><option value="شراكة" ${prefs.opportunity_type==='شراكة'?'selected':''}>شراكة</option><option value="بيع" ${prefs.opportunity_type==='بيع'?'selected':''}>بيع</option><option value="فكرة" ${prefs.opportunity_type==='فكرة'?'selected':''}>فكرة</option></select></div>
      <div class="pref-actions span2"><button type="submit" class="btn btn-green">حفظ الاهتمامات وتحديث التوصيات</button><button type="button" class="btn btn-outline" data-section-target="recommendations">عرض التوصيات</button></div>
    </form>
    <div class="premium-grid pref-benefits">
      <div><b>النسخة المجانية</b><strong>اقتراحات أساسية</strong><p>تحديد اهتمامات + عدد محدود من المشاريع المقترحة.</p></div>
      <div><b>النسخة المدفوعة</b><strong>Matching متقدم</strong><p>ميزانية، مجال، موقع، توثيق، مخاطر، وأرباح متوقعة.</p></div>
    </div>`;
  }
  function collectPrefs(form) {
    return normalizePrefs({
      budget_min: form.budget_min.value,
      budget_max: form.budget_max.value,
      interests: String(form.interests.value || '').split(/[,،]/).map(x => x.trim()).filter(Boolean),
      preferred_location: String(form.preferred_location.value || '').trim(),
      opportunity_type: String(form.opportunity_type.value || '').trim()
    });
  }
  function projectBudget(p) { return Number(p.price || p.investment_amount || p.asking_price || p.required_investment || 0); }
  function projectVerified(p) { return p.verification_status === 'verified'; }
  function projectOpportunityType(p) { return p.type || p.opportunity_type || p.deal_type || p.project_type || ''; }
  function projectScore(p,prefs){
    const r=window.AloInvestorCore.match(p,normalizePrefs(prefs));
    const labels={budget:'ضمن الميزانية',location:'الموقع مناسب',type:'نوع الفرصة مناسب',sector:'نفس المجال'};
    return {score:r.score,reasons:r.criteria.filter(x=>x.pass).map(x=>labels[x.key])};
  }

  function recommendationsSection(user) {
    setTimeout(() => loadRecommendations(user), 20);
    return panel('الفرص المقترحة لك', 'اقتراحات حسب الميزانية، المجال، الموقع، ونوع الفرصة.', '<div class="matching-summary" data-matching-summary></div><p class="trust-caption">الملاءمة تعتمد على توافق الخيارات التي حددتها فقط، ولا تمثل توقعًا لنجاح المشروع. <a href="workspace.html">مساحة متابعة المشاريع</a></p><div class="my-projects-list" data-recommended-projects>'+skeletonCards()+'</div>', '<button type="button" class="btn btn-green" data-refresh-recommendations>تحديث</button>');
  }
  async function fetchApprovedProjects() {
    const rows=[];let offset=0;
    while(true){const {data,error}=await window.supabaseClient.from('projects').select('*').in('status',['approved','active','published']).order('created_at',{ascending:false}).order('id',{ascending:true}).range(offset,offset+499);if(error)throw error;rows.push(...(data||[]));if((data||[]).length<500)break;offset+=500;}
    return rows;
  }
  function renderMatchingSummary(prefs, count, premium) {
    const tags = [];
    if (prefs.budget_min || prefs.budget_max) tags.push(`الميزانية: ${money(prefs.budget_min)} - ${money(prefs.budget_max)}`);
    if (prefs.interests?.length) tags.push(`المجالات: ${prefs.interests.join('، ')}`);
    if (prefs.preferred_location) tags.push(`الموقع: ${prefs.preferred_location}`);
    if (prefs.opportunity_type) tags.push(`النوع: ${prefs.opportunity_type}`);
    return `<div class="matching-card"><div><b>${premium ? 'توصيات Premium' : 'توصيات مجانية'}</b><p>${tags.length ? tags.map(esc).join(' • ') : 'لم تحدد اهتماماتك بعد، لذلك تظهر اقتراحات عامة.'}</p></div><span>${count} فرصة</span></div>`;
  }
  async function loadRecommendations(user, prefs) {
    const box = $('[data-recommended-projects]'); if (!box || !window.supabaseClient) return;
    box.innerHTML = skeletonCards();
    try {
      const ctx = window.__dashboardCtx || {};
      prefs = prefs || loadPrefs(user, ctx.profile);
      const premium = isPremium(ctx.profile);
      const data = await fetchApprovedProjects();
      const ranked = (data || []).map(p => { const r = projectScore(p, prefs); return { p, score:r.score, reasons:r.reasons }; }).sort((a,b) => (b.score??-1) - (a.score??-1) || Number(projectVerified(b.p))-Number(projectVerified(a.p)));
      const limit = premium ? 12 : 4;
      const limited = ranked.slice(0, limit);
      const summary = $('[data-matching-summary]'); if (summary) summary.innerHTML = renderMatchingSummary(prefs, limited.length, premium);
      if (!limited.length) { box.innerHTML = '<div class="empty-state"><b>لا توجد توصيات الآن</b><p>عدّل الاهتمامات أو انتظر إضافة مشاريع جديدة.</p><button type="button" class="btn btn-green" data-section-target="interests">تعديل الاهتمامات</button></div>'; return; }
      box.innerHTML = limited.map(({p, score, reasons}) => recommendationCard(p, score, reasons)).join('') + (!premium && ranked.length > limit ? `<div class="upgrade-lock"><b>🔒 يوجد ${ranked.length - limit} توصية إضافية</b><p>يمكنك تصفح جميع الفرص وإدارة مراجعتها من مساحة المتابعة.</p><a class="btn btn-green" href="plans.html">ترقية الباقة</a></div>` : '');
    } catch (err) { console.error(err); box.innerHTML = '<div class="empty-state">تعذر تحميل التوصيات. تأكد من جدول projects والصلاحيات.</div>'; }
  }
  function recommendationCard(p, score, reasons = []) {
    const item = encodeURIComponent(JSON.stringify({ id:p.id, title:p.title, category:p.category || p.sector, location:p.location, price:projectBudget(p) }));
    const id = encodeURIComponent(p.id || '');
    const reasonHtml = reasons.length ? `<div class="match-reasons">${reasons.map(r => `<span>${esc(r)}</span>`).join('')}</div>` : '';
    return `<article class="dashboard-project-card recommendation-card"><div><h3>${projectVerified(p)?'✅ ':''}${esc(p.title || 'مشروع')}</h3><p>${esc(p.category||p.sector||'')}${p.location?' • '+esc(p.location):''}${projectOpportunityType(p)?' • '+esc(projectOpportunityType(p)):''}</p><small>${score===null?'اقتراح عام — حدد اهتماماتك':'توافق مع اختياراتك: '+score+'%'}</small>${reasonHtml}</div><div class="project-card-actions"><b>${money(projectBudget(p))}</b><a class="btn btn-outline" href="project-details.html?id=${id}">عرض</a><button type="button" class="btn btn-outline" data-save-project="${item}">حفظ</button><button type="button" class="btn btn-green" data-contact-project="${item}">إرسال اهتمام</button></div></article>`;
  }

  function interestsSection(profile, user) { return panel('اهتمامات المستثمر', 'حدد الميزانية والمجالات والموقع حتى نرتب الفرص المناسبة.', preferencesForm(profile, user)); }
  function verificationSection(profile) {
    return panel('التوثيق', 'رفع ملفات توثيق المستثمر لزيادة الثقة عند التواصل.', `<div class="verification-status-card"><span>حالة التوثيق</span><b>${verificationLabel(profile.verification_status)}</b></div><form data-investor-verification-form class="verify-form" action="javascript:void(0)" enctype="multipart/form-data"><div class="form-grid"><div class="group"><label>نوع الملف</label><select name="file_label" required><option value="هوية شخصية">هوية شخصية</option><option value="كشف حساب بنكي">كشف حساب بنكي</option><option value="إثبات ملاءة مالية">إثبات ملاءة مالية</option><option value="مستند إضافي">مستند إضافي</option></select></div><div class="group"><label>رفع الملفات</label><input type="file" name="investor_verification_files" multiple accept=".pdf,image/*" required></div><button type="submit" class="btn btn-green span2">إرسال طلب التوثيق</button></div></form>`);
  }
  function profileSection(profile) {
    return panel('الملف الشخصي', 'تعديل معلومات التواصل ونوع الحساب.', `<form data-profile-form class="form-grid" action="javascript:void(0)"><div class="group"><label>الاسم</label><input name="name" value="${esc(profile.name)}" required></div><div class="group"><label>رقم الهاتف</label><input name="phone" value="${esc(profile.phone)}"></div><div class="group"><label>رقم الواتساب</label><input name="whatsapp" value="${esc(profile.whatsapp)}"></div><div class="group"><label>نوع الحساب</label><select name="account_type"><option value="investor" ${profile.account_type==='investor'?'selected':''}>مستثمر</option><option value="owner" ${profile.account_type==='owner'?'selected':''}>صاحب مشروع</option><option value="both" ${profile.account_type==='both'?'selected':''}>مستثمر وصاحب مشروع</option></select></div><button type="submit" class="btn btn-green span2">حفظ البيانات</button></form>`);
  }
  function projectMiniCard(p, label) {
    const id = encodeURIComponent(p.id || '');
    return `<article class="dashboard-project-card"><div><h3>${esc(p.title || 'مشروع')}</h3><p>${esc(p.category || '')}${p.location ? ' • '+esc(p.location) : ''}</p><small>${label}</small></div><div class="project-card-actions"><b>${money(p.price)}</b>${p.id ? `<a class="btn btn-outline" href="project-details.html?id=${id}">عرض</a>` : ''}<button type="button" class="btn btn-outline" data-remove-project="${esc(p.id || p.title)}">إزالة</button></div></article>`;
  }

  function investorRequestCard(row) {
    const project = row.project || row.project_snapshot || {};
    const investor = row.investor || {};
    const id = encodeURIComponent(project.id || row.project_id || '');
    const investorId = encodeURIComponent(investor.auth_id || row.investor_auth_id || '');
    const name = investor.name || investor.full_name || 'مستثمر';
    const phone = investor.phone || '';
    const whatsapp = investor.whatsapp || '';
    const prefs = normalizePrefs(investor.investor_preferences || {
      budget_min: investor.budget_min,
      budget_max: investor.budget_max,
      preferred_location: investor.preferred_location,
      interests: investor.preferred_categories
    });
    const budget = (prefs.budget_min || prefs.budget_max) ? `${money(prefs.budget_min)} - ${money(prefs.budget_max)}` : 'غير محددة';
    const interests = prefs.interests?.length ? prefs.interests.join('، ') : 'غير محددة';
    const waNumber = String(whatsapp || phone || '').replace(/\D/g,'');
    const contactLinks = [
      waNumber ? `<a class="btn btn-green" target="_blank" rel="noopener" href="https://wa.me/${esc(waNumber)}">واتساب</a>` : '',
      investorId ? `<a class="btn btn-outline" href="chat.html?investor=${investorId}&project=${id}">شات داخلي</a>` : ''
    ].filter(Boolean).join('');
    return `<article class="dashboard-project-card investor-request-card">
      <div>
        <h3>${esc(name)}</h3>
        <p>مهتم بمشروع: <b>${esc(project.title || 'مشروعك')}</b></p>
        <small>الميزانية: ${esc(budget)} • المجالات: ${esc(interests)}${prefs.preferred_location ? ' • الموقع: '+esc(prefs.preferred_location) : ''}</small>
        <div class="request-contact-info">${whatsapp ? `<span>🟢 واتساب: ${esc(whatsapp)}</span>` : phone ? `<span>📞 هاتف: ${esc(phone)}</span>` : '<span>لا توجد بيانات واتساب</span>'}</div>
      </div>
      <div class="project-card-actions">
        ${project.id || row.project_id ? `<a class="btn btn-outline" href="project-details.html?id=${id}">عرض المشروع</a>` : ''}
        ${contactLinks || '<span class="muted">لا توجد وسيلة تواصل متاحة</span>'}
      </div>
    </article>`;
  }

  async function loadOwnerInvestorRequests(ctx) {
    if (!window.supabaseClient || !ctx?.user?.id) return [];
    const projects = await queryOwnerProjects(ctx.user);
    const ownerProjectIds = projects.map(p => p.id).filter(Boolean);
    if (!ownerProjectIds.length) return [];

    const { data: contacts, error } = await window.supabaseClient
      .from('investor_contacted_projects')
      .select('*')
      .in('project_id', ownerProjectIds)
      .order('created_at', { ascending:false });
    if (error) throw error;
    if (!contacts?.length) return [];

    const investorIds = [...new Set(contacts.map(x => x.investor_auth_id).filter(Boolean))];
    let investors = [];
    if (investorIds.length) {
      const usersRes = await window.supabaseClient
        .from('users')
        .select('auth_id,name,phone,whatsapp,account_type,verification_status,investor_preferences,preferred_categories,preferred_location,budget_min,budget_max')
        .in('auth_id', investorIds);
      if (!usersRes.error) investors = usersRes.data || [];
    }

    const investorMap = Object.fromEntries(investors.map(u => [u.auth_id, u]));
    const projectMap = Object.fromEntries(projects.map(p => [p.id, p]));
    return contacts.map(c => ({ ...c, investor: investorMap[c.investor_auth_id] || {}, project: projectMap[c.project_id] || c.project_snapshot || {} }));
  }

  function addActivity(user, title, desc) {
    if (!user) return;
    const list = readList(activityKey(user));
    list.unshift({ title, desc, at: Date.now() });
    writeList(activityKey(user), list.slice(0, 40));
  }
  function addNotification(user, title, desc, type='info') {
    if (!user) return;
    const list = readList(notificationsKey(user));
    list.unshift({ id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, title, desc, type, read:false, at: Date.now() });
    writeList(notificationsKey(user), list.slice(0, 50));
  }
  function relativeTime(ts) {
    if (!ts) return '';
    const mins = Math.max(1, Math.round((Date.now() - Number(ts)) / 60000));
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const h = Math.round(mins / 60); if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${Math.round(h/24)} يوم`;
  }
  function notificationRow(n) {
    return `<article class="notification-row ${n.read?'is-read':''}" data-notification-id="${esc(n.id)}"><div><b>${esc(n.title)}</b><p>${esc(n.desc || '')}</p><small>${relativeTime(n.at)}</small></div><button type="button" class="btn btn-outline" data-read-notification="${esc(n.id)}">${n.read?'مقروء':'تحديد كمقروء'}</button></article>`;
  }
  function notificationsSection(ctx) {
    let list = readList(notificationsKey(ctx.user));
    if (!list.length) {
      list = [
        { id:'welcome', title:'مرحباً بك في إلو مستثمر', desc:'هنا ستظهر تنبيهات المشاريع، الحفظ، التواصل، والتوثيق.', read:false, at:Date.now() },
        { id:'tips', title:'نصيحة', desc:'حدّث اهتماماتك لتحصل على توصيات أدق.', read:false, at:Date.now()-3600000 }
      ];
      writeList(notificationsKey(ctx.user), list);
    }
    const body = list.length ? `<div class="notifications-list">${list.map(notificationRow).join('')}</div>` : '<div class="empty-state">لا توجد إشعارات الآن.</div>';
    return panel('الإشعارات', 'تنبيهات الحساب والفرص والتوثيق.', body, '<button type="button" class="btn btn-outline" data-mark-all-notifications>تحديد الكل كمقروء</button>');
  }
  function activitySection(ctx) {
    const list = readList(activityKey(ctx.user));
    const body = list.length ? `<div class="activity-list">${list.map(a => `<article><span></span><div><b>${esc(a.title)}</b><p>${esc(a.desc || '')}</p><small>${relativeTime(a.at)}</small></div></article>`).join('')}</div>` : `<div class="future-grid">${soon('لا يوجد نشاط بعد','ستظهر هنا عمليات الحفظ، التواصل، تحديث الاهتمامات، وإضافة المشاريع.')}${soon('Activity Timeline','جاهزة للتوسع وربطها بالباكند لاحقًا.')}</div>`;
    return panel('آخر النشاط', 'ملخص سريع لكل ما يحدث في حسابك.', body);
  }
  function ownerRequestsSection(ctx){
    return panel('اهتمامات المستثمرين','تابع الاهتمام، وموافقات مشاركة التواصل، ومراحل المتابعة.','<a class="btn btn-green" href="owner-leads.html">افتح متابعة المستثمرين</a>');
  }

  function savedSection(ctx){
    return panel('المحفوظات والمتابعة','مشاريعك المحفوظة وملاحظات المراجعة مرتبطة بحسابك.','<p>تابع مراحل المراجعة، المستندات والتواصل لكل مشروع.</p><a class="btn btn-green" href="workspace.html">افتح مساحة المتابعة</a>');
  }
  function contactedSection(ctx) {
    return panel('اهتماماتي المسجلة','راجع الاهتمام ومشاركة بيانات التواصل أو اسحب اهتمامك.','<a class="btn btn-green" href="my-interests.html">إدارة الاهتمامات ومشاركة التواصل</a>');
  }

  async function renderSection(id, ctx) {
    const { user, profile } = ctx; const content = $('[data-dash-content]'); if (!content) return;
    $$('[data-section-target]').forEach(b => b.classList.toggle('active', b.dataset.sectionTarget === id));
    const titleMap = { overview:'نظرة عامة', 'my-projects':'مشاريعي', 'owner-analytics':'الإحصائيات', 'owner-requests':'طلبات المستثمرين', recommendations:'الفرص المقترحة', interests:'اهتماماتي', verification:'التوثيق', saved:'المحفوظات', contacted:'الاهتمامات المسجلة', notifications:'الإشعارات', activity:'آخر النشاط', profile:'الملف الشخصي' };
    const title = $('[data-section-title]'); if (title) title.textContent = titleMap[id] || 'لوحة التحكم';
    content.innerHTML = skeletonCards();
    if (id === 'overview') content.innerHTML = renderOverview(profile);
    else if (id === 'my-projects') content.innerHTML = await ownerProjectsSection(user);
    else if (id === 'owner-analytics') content.innerHTML = ownerAnalyticsSection();
    else if (id === 'owner-requests') content.innerHTML = ownerRequestsSection(ctx);
    else if (id === 'recommendations') content.innerHTML = recommendationsSection(user);
    else if (id === 'interests') content.innerHTML = interestsSection(profile, user);
    else if (id === 'verification') content.innerHTML = verificationSection(profile);
    else if (id === 'saved') content.innerHTML = savedSection(ctx);
    else if (id === 'contacted') content.innerHTML = contactedSection(ctx);
    else if (id === 'notifications') content.innerHTML = notificationsSection(ctx);
    else if (id === 'activity') content.innerHTML = activitySection(ctx);
    else if (id === 'profile') content.innerHTML = profileSection(profile);
    else content.innerHTML = renderOverview(profile);
    wireCurrentForms(ctx);
  }

  function decodeProjectPayload(value) { try { return JSON.parse(decodeURIComponent(value || '')); } catch { return null; } }
  function addUniqueProject(key, p) {
    if (!p) return false;
    const list = readList(key);
    const exists = list.some(x => String(x.id || x.title) === String(p.id || p.title));
    if (!exists) list.unshift({...p, saved_at: Date.now()});
    writeList(key, list.slice(0, 50));
    return !exists;
  }
  async function tryInsertProjectAction(table,user,p){
    if(table==='investor_saved_projects')return window.AloInvestor.saveProject(p);
    const {error}=await window.supabaseClient.from(table).upsert([{investor_auth_id:user.id,project_id:p.id,project_snapshot:p}],{onConflict:'investor_auth_id,project_id'});if(error)throw error;
  }

  function wireShell(ctx) {
    const shell = $('[data-dash-shell]'); if (!shell || shell.dataset.delegated === '1') return; shell.dataset.delegated = '1';
    shell.addEventListener('click', async (e) => {
      const sectionBtn = e.target.closest('[data-section-target]');
      if (sectionBtn && shell.contains(sectionBtn)) { e.preventDefault(); $('.dash-sidebar')?.classList.remove('open'); renderSection(sectionBtn.dataset.sectionTarget, ctx); return; }
      const refreshBtn = e.target.closest('[data-refresh-recommendations]');
      if (refreshBtn) { e.preventDefault(); loadRecommendations(ctx.user); showToast('تم تحديث التوصيات'); return; }
      const saveBtn=e.target.closest('[data-save-project]');
      const contactBtn=e.target.closest('[data-contact-project]');
      if(saveBtn||contactBtn){
        e.preventDefault();const btn=saveBtn||contactBtn,p=decodeProjectPayload(saveBtn?btn.dataset.saveProject:btn.dataset.contactProject);btn.disabled=true;
        try{if(saveBtn)await tryInsertProjectAction('investor_saved_projects',ctx.user,p);else await window.AloReview.invoke('set_project_interest_v76',{project_key:p.id,share_contact:false,active_interest:true});addUniqueProject(saveBtn?savedKey(ctx.user):contactedKey(ctx.user),p);showToast(saveBtn?'تم حفظ المشروع في حسابك':'تم تسجيل الاهتمام دون مشاركة بيانات التواصل');}
        catch(err){console.warn(err);showToast('تعذر الحفظ. حاول مرة أخرى.');}finally{btn.disabled=false;}return;
      }
      const removeBtn = e.target.closest('[data-remove-project]');
      if (removeBtn) { e.preventDefault(); const id = String(removeBtn.dataset.removeProject || ''); ['saved','contacted'].forEach(section => { const key = section === 'saved' ? savedKey(ctx.user) : contactedKey(ctx.user); writeList(key, readList(key).filter(x => String(x.id || x.title) !== id)); }); showToast('تمت الإزالة'); renderSection($('.dash-link.active')?.dataset.sectionTarget || 'overview', ctx); return; }
      const readBtn = e.target.closest('[data-read-notification]');
      if (readBtn) { e.preventDefault(); const id = readBtn.dataset.readNotification; const list = readList(notificationsKey(ctx.user)).map(n => n.id === id ? {...n, read:true} : n); writeList(notificationsKey(ctx.user), list); renderSection('notifications', ctx); return; }
      const markAllBtn = e.target.closest('[data-mark-all-notifications]');
      if (markAllBtn) { e.preventDefault(); writeList(notificationsKey(ctx.user), readList(notificationsKey(ctx.user)).map(n => ({...n, read:true}))); showToast('تم تحديد الكل كمقروء'); renderSection('notifications', ctx); return; }
      const soonBtn = e.target.closest('[data-soon-action]');
      if (soonBtn) { e.preventDefault(); showToast('هذه الميزة جاهزة بصريًا وسيتم ربطها بالباكند لاحقًا'); return; }
    });
    $('[data-open-sidebar]')?.addEventListener('click', () => $('.dash-sidebar')?.classList.toggle('open'));
  }

  function wireCurrentForms(ctx) { initProfileFormSafe(ctx); wireInvestor(ctx); initInvestorVerificationForm(ctx); }

  function initProfileFormSafe(ctx) {
    const form = $('[data-profile-form]'); if (!form || form.dataset.ready === '1') return; form.dataset.ready = '1';
    form.addEventListener('submit', async (e) => { e.preventDefault(); const btn = form.querySelector('button[type="submit"]'); const old = btn?.textContent || 'حفظ البيانات';
      try { if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; } const user = ctx.user || await window.getSessionUser?.(); if (!user) throw new Error('يجب تسجيل الدخول أولاً'); const payload = { name: form.name.value || '', phone: form.phone.value || '', whatsapp: form.whatsapp.value || '', account_type: normalizeAccountType(form.account_type.value) }; const { error } = await window.supabaseClient.from('users').update(payload).eq('auth_id', user.id); if (error) throw error; saveCache(user, {...ctx.profile, ...payload}); addActivity(user, 'تحديث الملف الشخصي', 'تم حفظ بيانات الحساب'); showToast('تم حفظ البيانات ✅'); await loadUserDashboard(); } catch (err) { console.error(err); alert(err.message || 'فشل حفظ البيانات'); } finally { if (btn) { btn.disabled = false; btn.textContent = old; } }
    });
  }

  function wireInvestor(ctx) {
    $$('[data-investor-preferences-form]').forEach(form=>{
      if(form.dataset.ready==='1')return;form.dataset.ready='1';
      form.addEventListener('submit',async e=>{
        e.preventDefault();const btn=form.querySelector('button[type=submit]'),old=btn.textContent,prefs=collectPrefs(form);
        if(prefs.budget_max&&prefs.budget_max<prefs.budget_min){showToast('الميزانية العليا يجب أن تكون أكبر من الدنيا');return;}
        try{btn.disabled=true;btn.textContent='جاري الحفظ...';const merged=await window.AloInvestor.updatePreferences(prefs);ctx.profile.investor_preferences=merged;savePrefs(ctx.user,prefs);showToast('تم حفظ الاهتمامات في حسابك');renderSection('recommendations',ctx);}
        catch(err){console.warn(err);showToast('تعذر حفظ الاهتمامات. حاول مرة أخرى.');}
        finally{btn.disabled=false;btn.textContent=old;}
      });
    });
  }

  function initInvestorVerificationForm(ctx){
    $$('[data-investor-verification-form]').forEach(form=>{if(form.dataset.ready)return;form.dataset.ready='1';form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button[type=submit]');if(b.disabled)return;const files=Array.from(form.querySelector('[name=investor_verification_files]')?.files||[]);if(!files.length){alert('اختر مستندًا');return;}b.disabled=true;
      try{await window.AloReview.submitDocs(files,ctx.user.id,null,form.querySelector('[name=file_label]')?.value||'');showToast('تم تقديم المستندات للمراجعة');form.reset();}
      catch(err){alert(err.message||'تعذر تقديم المستندات');}finally{b.disabled=false;}
    });});
  }

  async function loadUserDashboard() {
    const root = $('#roleDashboard'); if (!root) return;
    try {
      root.innerHTML = `<section class="dash-shell loading"><div class="dash-main"><div class="dash-content">${skeletonCards()}</div></div></section>`;
      const { user, profile } = await getCurrentSafe(); if (!user) { window.location.href = 'login.html'; return; }
      const type = normalizeAccountType(profile.account_type); document.body.className = document.body.className.replace(/\brole-(investor|owner|both)\b/g, '').trim(); document.body.classList.add('role-' + type); setNav(type);
      root.classList.remove('account-page'); root.innerHTML = layout(profile); const ctx = { user, profile }; window.__dashboardCtx = ctx;
      wireShell(ctx); setTimeout(() => window.loadPlatformAds?.(), 80); await renderSection('overview', ctx);
    } catch (err) { console.error('dashboard fatal:', err); root.innerHTML = `<section class="role-panel"><h2>تعذر تحميل لوحة التحكم</h2><p>في خطأ JavaScript أو صلاحيات Supabase.</p><pre style="direction:ltr;white-space:pre-wrap;background:#f8faf9;padding:12px;border-radius:12px">${esc(err.message || err)}</pre><button class="btn btn-green" onclick="location.reload()">إعادة المحاولة</button></section>`; }
  }

  window.normalizeAccountType = normalizeAccountType;
  window.loadUserDashboard = loadUserDashboard;
})();
