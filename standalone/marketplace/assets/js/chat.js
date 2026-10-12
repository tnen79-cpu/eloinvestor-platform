// إلو مستثمر v29 - Internal Chat + Realtime
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    user: null,
    profile: null,
    conversations: [],
    activeConversation: null,
    realtimeChannel: null,
    pollTimer: null,
    typingTimer: null,
    lastTypingAt: 0,
    activeMessages: [],
    onlineMap: {},
    search: '',
    reportingConversation: null,
    selectedAttachment: null
  };

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function fmtDate(value) {
    if (!value) return '';
    try {
      const d = new Date(value);
      const now = new Date();
      const sameDay = d.toDateString() === now.toDateString();
      return sameDay
        ? d.toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('ar', { month: 'short', day: 'numeric' });
    } catch (_) { return ''; }
  }

  function notify(message, type = 'success') {
    if (window.showToast) return window.showToast(message);
    let el = $('.app-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'app-toast';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.dataset.type = type;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2800);
  }

  async function getUser() {
    if (!window.supabaseClient && typeof window.initSupabase === 'function') window.initSupabase();
    const { data, error } = await window.supabaseClient.auth.getUser();
    if (error || !data?.user) return null;
    return data.user;
  }

  async function getProfile(user) {
    if (!user) return null;
    const { data } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('auth_id', user.id)
      .maybeSingle();
    return data || { auth_id: user.id, email: user.email, name: user.email || 'مستخدم' };
  }

  function otherAuthId(row) {
    if (!state.user) return '';
    return row.owner_auth_id === state.user.id ? row.investor_auth_id : row.owner_auth_id;
  }

  function otherName(row) {
    const other = otherAuthId(row);
    const users = row._participants || {};
    return users[other]?.name || users[other]?.email || (row.owner_auth_id === state.user?.id ? 'مستثمر' : 'صاحب المشروع');
  }

  function projectTitle(row) {
    return row.project_snapshot?.title || row._project?.title || row.title || 'محادثة مشروع';
  }

  function fmtLastSeen(value) {
    if (!value) return 'غير متصل';
    try {
      const d = new Date(value);
      const diff = Math.max(0, Date.now() - d.getTime());
      if (diff < 60000) return 'متصل الآن';
      const mins = Math.floor(diff / 60000);
      if (mins < 60) return `آخر ظهور منذ ${mins} دقيقة`;
      const hrs = Math.floor(mins / 60);
      if (hrs < 24) return `آخر ظهور منذ ${hrs} ساعة`;
      return `آخر ظهور ${d.toLocaleDateString('ar')}`;
    } catch (_) { return 'غير متصل'; }
  }

  function isOnline(authId) {
    return !!state.onlineMap[authId]?.is_online;
  }

  function unreadCount(row) {
    if (!state.user) return 0;
    return row.owner_auth_id === state.user.id ? Number(row.unread_owner || 0) : Number(row.unread_investor || 0);
  }

  function renderConversation(row) {
    const active = state.activeConversation?.id === row.id;
    const unread = unreadCount(row);
    return `
      <button type="button" class="chat-conversation-card ${active ? 'active' : ''}" data-open-conversation="${esc(row.id)}">
        <div class="chat-avatar ${isOnline(otherAuthId(row)) ? 'is-online' : ''}">${esc(otherName(row).trim().slice(0, 1) || 'م')}</div>
        <div class="chat-conv-body">
          <div class="chat-conv-top">
            <b>${esc(projectTitle(row))}</b>
            <time>${esc(fmtDate(row.last_message_at || row.updated_at || row.created_at))}</time>
          </div>
          <p>${esc(otherName(row))}</p>
          <span>${esc(row._typing ? 'يكتب الآن...' : (row.last_message || 'لا توجد رسائل بعد'))}</span>
        </div>
        ${unread ? `<small class="chat-unread-badge">${unread}</small>` : ''}
      </button>`;
  }

  function renderConversations() {
    const box = $('#chatConversations');
    if (!box) return;
    const term = state.search.trim().toLowerCase();
    const rows = !term ? state.conversations : state.conversations.filter(row => {
      return `${projectTitle(row)} ${otherName(row)} ${row.last_message || ''}`.toLowerCase().includes(term);
    });
    if (!rows.length) {
      box.innerHTML = `<div class="chat-empty-mini">لا توجد محادثات حتى الآن.</div>`;
      return;
    }
    box.innerHTML = rows.map(renderConversation).join('');
  }

  function renderHeader(row) {
    const header = $('#chatRoomHeader');
    if (!header) return;
    if (!row) {
      header.innerHTML = `<div><span class="eyebrow">اختر محادثة</span><h2>ابدأ محادثة داخلية آمنة</h2><p>التواصل يتم داخل المنصة بدون إظهار الإيميل.</p></div>`;
      return;
    }
    const other = otherAuthId(row);
    const presence = state.onlineMap[other] || {};
    header.innerHTML = `
      <button type="button" class="chat-back-mobile" data-chat-back>‹</button>
      <div class="chat-room-title">
        <span class="eyebrow">${esc(otherName(row))}</span>
        <h2>${esc(projectTitle(row))}</h2>
        <p>محادثة مرتبطة بالمشروع · بدون مشاركة الإيميل</p>
        <small id="chatPresenceStatus" class="chat-presence-status ${isOnline(other) ? 'online' : ''}">${esc(isOnline(other) ? '● متصل الآن' : fmtLastSeen(presence.last_seen))}</small>
        <small id="chatTypingIndicator" class="chat-typing-indicator" hidden>يكتب الآن...</small>
      </div>
      <div class="chat-room-actions">
        <button type="button" class="btn btn-outline chat-report-btn" data-chat-report="${esc(row.id)}">إبلاغ</button>
        <a class="btn btn-outline" href="project-details.html?id=${encodeURIComponent(row.project_id || '')}">عرض المشروع</a>
      </div>
    `;
  }

  function messageStatus(msg) {
    if (msg.sender_auth_id !== state.user?.id) return '';
    if (msg.read_at) return '✓✓ تمت القراءة';
    if (msg.delivered_at || msg.created_at) return '✓ تم الإرسال';
    return 'جارٍ الإرسال';
  }

  function attachmentMarkup(msg) {
    if (!msg.attachment_url) return '';
    const name = esc(msg.attachment_name || 'مرفق');
    const url = esc(msg.attachment_url);
    const type = String(msg.attachment_type || '');
    const size = Number(msg.attachment_size || 0);
    const sizeText = size ? ` · ${(size / 1024 / 1024).toFixed(size > 1024 * 1024 ? 1 : 2)} MB` : '';
    if (type.startsWith('image/')) {
      return `<a class="chat-attachment image" href="${url}" target="_blank" rel="noopener"><img src="${url}" alt="${name}" loading="lazy"><span>${name}${esc(sizeText)}</span></a>`;
    }
    return `<a class="chat-attachment file" href="${url}" target="_blank" rel="noopener"><strong>📎</strong><span>${name}${esc(sizeText)}</span></a>`;
  }

  function messageBubble(msg) {
    const mine = msg.sender_auth_id === state.user?.id;
    const safeBody = esc(msg.body || '');
    return `
      <div class="chat-message-row ${mine ? 'mine' : 'theirs'}" data-message-id="${esc(msg.id || '')}">
        <div class="chat-message-bubble">
          ${safeBody ? `<p>${safeBody}</p>` : ''}
          ${attachmentMarkup(msg)}
          <div class="chat-message-meta">
            <time>${esc(fmtDate(msg.created_at))}</time>
            ${mine ? `<span>${esc(messageStatus(msg))}</span>` : ''}
          </div>
        </div>
      </div>`;
  }

  function renderMessages(messages) {
    const panel = $('#chatMessages');
    if (!panel) return;
    state.activeMessages = messages || [];
    panel.innerHTML = state.activeMessages.length ? state.activeMessages.map(messageBubble).join('') : `
      <div class="chat-empty-state"><div>👋</div><h3>ابدأ أول رسالة</h3><p>اسأل عن تفاصيل المشروع أو أرسل طلبك بشكل واضح.</p></div>`;
    panel.scrollTop = panel.scrollHeight;
  }

  async function loadMessages(conversationId) {
    const panel = $('#chatMessages');
    const input = $('#chatMessageInput');
    const btn = $('#chatForm button[type="submit"]');
    const attach = $('#chatAttachmentInput');
    if (!panel) return;
    panel.innerHTML = `<div class="chat-loading">جاري تحميل الرسائل...</div>`;

    const { data, error } = await window.supabaseClient
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      panel.innerHTML = `<div class="chat-empty-state"><h3>تعذر تحميل الرسائل</h3><p>${esc(error.message)}</p></div>`;
      return;
    }

    renderMessages(data || []);
    if (input) input.disabled = false;
    if (btn) btn.disabled = false;
    if (attach) attach.disabled = false;
    await markConversationRead(conversationId);
  }

  async function markConversationRead(conversationId) {
    const row = state.conversations.find(x => x.id === conversationId);
    if (!row || !state.user) return;
    const patch = row.owner_auth_id === state.user.id ? { unread_owner: 0 } : { unread_investor: 0 };
    try {
      await window.supabaseClient.from('chat_conversations').update(patch).eq('id', conversationId);
      await window.supabaseClient
        .from('chat_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('receiver_auth_id', state.user.id)
        .is('read_at', null)
        .then(()=>{},()=>{});
      Object.assign(row, patch);
      renderConversations();
      if (window.refreshNotificationBadges) window.refreshNotificationBadges();
    } catch (e) { console.warn('mark read failed', e); }
  }

  function cleanupRealtime() {
    if (state.pollTimer) { clearInterval(state.pollTimer); state.pollTimer = null; }
    if (state.realtimeChannel) {
      try { window.supabaseClient.removeChannel(state.realtimeChannel); } catch (_) {}
      state.realtimeChannel = null;
    }
  }

  function showTyping(isTyping) {
    const el = $('#chatTypingIndicator');
    if (!el) return;
    el.hidden = !isTyping;
  }

  function updatePresenceUI() {
    if (!state.activeConversation) return;
    const other = otherAuthId(state.activeConversation);
    const el = $('#chatPresenceStatus');
    if (!el) return;
    const presence = state.onlineMap[other] || {};
    el.classList.toggle('online', isOnline(other));
    el.textContent = isOnline(other) ? '● متصل الآن' : fmtLastSeen(presence.last_seen);
    renderConversations();
  }

  async function touchPresence(isOnlineValue = true) {
    if (!state.user) return;
    try {
      await window.supabaseClient.from('chat_presence').upsert({
        user_auth_id: state.user.id,
        is_online: !!isOnlineValue,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_auth_id' });
    } catch (_) {}
  }

  function startMessagePolling(conversationId) {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(async () => {
      if (!state.activeConversation || state.activeConversation.id !== conversationId) return;
      const { data } = await window.supabaseClient
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      if (!data) return;
      const oldLast = state.activeMessages[state.activeMessages.length - 1]?.id;
      const newLast = data[data.length - 1]?.id;
      const readChanged = JSON.stringify((state.activeMessages || []).map(m => [m.id, m.read_at])) !== JSON.stringify((data || []).map(m => [m.id, m.read_at]));
      if (oldLast !== newLast || readChanged || data.length !== state.activeMessages.length) {
        renderMessages(data);
        markConversationRead(conversationId);
      }
      loadConversations(false);
    }, 3000);
  }

  function subscribeConversation(conversationId) {
    cleanupRealtime();
    startMessagePolling(conversationId);
    if (!window.supabaseClient?.channel) return;

    state.realtimeChannel = window.supabaseClient
      .channel(`chat-conversation-${conversationId}`, { config: { presence: { key: state.user?.id || 'guest' } } })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        const panel = $('#chatMessages');
        if (!panel || !payload.new) return;
        const exists = state.activeMessages.some(m => String(m.id) === String(payload.new.id));
        if (!exists) {
          const empty = $('.chat-empty-state', panel) || $('.chat-loading', panel);
          if (empty) panel.innerHTML = '';
          state.activeMessages.push(payload.new);
          panel.insertAdjacentHTML('beforeend', messageBubble(payload.new));
          panel.scrollTop = panel.scrollHeight;
        }
        loadConversations(false);
        markConversationRead(conversationId);
      })
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${conversationId}`
      }, payload => {
        if (!payload.new) return;
        const i = state.activeMessages.findIndex(m => String(m.id) === String(payload.new.id));
        if (i >= 0) {
          state.activeMessages[i] = payload.new;
          renderMessages(state.activeMessages);
        }
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_presence'
      }, payload => {
        const row = payload.new || payload.old;
        if (row?.user_auth_id) {
          state.onlineMap[row.user_auth_id] = row;
          updatePresenceUI();
        }
      })
      .on('broadcast', { event: 'typing' }, payload => {
        if (!payload?.payload || payload.payload.sender_auth_id === state.user?.id) return;
        if (String(payload.payload.conversation_id) !== String(conversationId)) return;
        const isTyping = !!payload.payload.is_typing;
        const row = state.conversations.find(x => String(x.id) === String(conversationId));
        if (row) row._typing = isTyping;
        showTyping(isTyping);
        renderConversations();
        if (state.typingTimer) clearTimeout(state.typingTimer);
        if (isTyping) {
          state.typingTimer = setTimeout(() => {
            const r = state.conversations.find(x => String(x.id) === String(conversationId));
            if (r) r._typing = false;
            showTyping(false);
            renderConversations();
          }, 2600);
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const presenceState = state.realtimeChannel.presenceState();
        Object.entries(presenceState || {}).forEach(([uid, list]) => {
          state.onlineMap[uid] = { user_auth_id: uid, is_online: true, last_seen: new Date().toISOString(), _presence: list };
        });
        updatePresenceUI();
      })
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await state.realtimeChannel.track({ user_auth_id: state.user.id, online_at: new Date().toISOString() });
          await touchPresence(true);
        }
      });
  }

  async function openConversation(id) {
    const row = state.conversations.find(x => String(x.id) === String(id));
    if (!row) return;
    state.activeConversation = row;
    document.body.classList.add('chat-opened-mobile');
    renderConversations();
    renderHeader(row);
    subscribeConversation(row.id);
    await loadMessages(row.id);
  }

  async function attachParticipants(rows) {
    const ids = [...new Set(rows.flatMap(r => [r.owner_auth_id, r.investor_auth_id]).filter(Boolean))];
    const projects = [...new Set(rows.map(r => r.project_id).filter(Boolean))];
    let usersMap = {};
    let projectsMap = {};
    if (ids.length) {
      const { data } = await window.supabaseClient.from('users').select('auth_id,name,email,phone,whatsapp,account_type').in('auth_id', ids);
      usersMap = Object.fromEntries((data || []).map(u => [u.auth_id, u]));
    }
    if (projects.length) {
      const { data } = await window.supabaseClient.from('projects').select('id,title,category,location,status,verification_status,image_url').in('id', projects);
      projectsMap = Object.fromEntries((data || []).map(p => [p.id, p]));
    }
    rows.forEach(row => {
      row._participants = usersMap;
      row._project = projectsMap[row.project_id];
    });
    return rows;
  }

  async function loadPresenceForConversations() {
    const ids = [...new Set((state.conversations || []).map(otherAuthId).filter(Boolean))];
    if (!ids.length) return;
    try {
      const { data } = await window.supabaseClient
        .from('chat_presence')
        .select('user_auth_id,is_online,last_seen,updated_at')
        .in('user_auth_id', ids);
      (data || []).forEach(row => { state.onlineMap[row.user_auth_id] = row; });
    } catch (_) {}
  }

  async function loadConversations(showLoading = true) {
    const box = $('#chatConversations');
    if (showLoading && box) box.innerHTML = `<div class="chat-skeleton"></div><div class="chat-skeleton short"></div><div class="chat-skeleton"></div>`;
    const uid = state.user?.id;
    if (!uid) return;

    const { data, error } = await window.supabaseClient
      .from('chat_conversations')
      .select('*')
      .or(`owner_auth_id.eq.${uid},investor_auth_id.eq.${uid}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      if (box) box.innerHTML = `<div class="chat-empty-mini"><b>تعذر تحميل المحادثات</b><p>${esc(error.message)}</p><small>تأكد من تشغيل ملف supabase/v31-chat-moderation.sql وملف v29 chat إذا لم يتم تشغيله.</small></div>`;
      return;
    }
    state.conversations = await attachParticipants(data || []);
    await loadPresenceForConversations();
    renderConversations();
    if (state.activeConversation) {
      const updated = state.conversations.find(x => x.id === state.activeConversation.id);
      if (updated) state.activeConversation = updated;
    }
  }

  function resetAttachmentPreview() {
    state.selectedAttachment = null;
    const input = $('#chatAttachmentInput');
    const preview = $('#chatAttachmentPreview');
    if (input) input.value = '';
    if (preview) { preview.hidden = true; preview.innerHTML = ''; }
  }

  function setAttachmentPreview(file) {
    const preview = $('#chatAttachmentPreview');
    if (!preview) return;
    if (!file) return resetAttachmentPreview();
    const max = 10 * 1024 * 1024;
    if (file.size > max) {
      notify('حجم المرفق يجب ألا يتجاوز 10MB', 'error');
      return resetAttachmentPreview();
    }
    state.selectedAttachment = file;
    preview.hidden = false;
    preview.innerHTML = `<span>📎 ${esc(file.name)} · ${(file.size / 1024 / 1024).toFixed(file.size > 1024 * 1024 ? 1 : 2)} MB</span><button type="button" data-remove-chat-attachment>×</button>`;
  }

  async function uploadChatAttachment(file,conversationId,key){
    if(!file)return null;
    return {attachment_url:await window.AloFlows.upload(file,'chat-attachments',state.user.id,conversationId+'/'+key),attachment_name:file.name,attachment_type:file.type,attachment_size:file.size};
  }
  async function sendMessage(e){
    e.preventDefault();if(state.sending)return;
    const input=$('#chatMessageInput'),text=input?.value?.trim()||'',file=state.selectedAttachment,conv=state.activeConversation;
    if((!text&&!file)||!conv||!state.user)return;
    if(text.length>5000){notify('الحد الأقصى للرسالة 5000 حرف','error');return;}
    const btn=$('#chatForm button[type=submit]'),old=btn?.textContent;state.sending=true;
    try{
      await window.AloFlows.ensureTransactions();
      if(file)window.AloFlows.validate(file,'chat-attachments');
      if(btn){btn.disabled=true;btn.textContent='جاري الإرسال...';}
      const request=await window.AloFlows.requestKey(state.user.id+'_chat',{conversation:conv.id,text},file?[file]:[]);
      const attachment=await uploadChatAttachment(file,conv.id,request.id);
      const {data,error}=await window.supabaseClient.rpc('send_chat_message_v75',{message_key:request.id,conversation_key:conv.id,message_text:text,attachment});if(error||!data)throw error||new Error('تعذر إرسال الرسالة');
      request.clear();
      // Preserve anything the user typed or selected while the request was in flight.
      if(state.activeConversation?.id===conv.id){if(input&&input.value.trim()===text)input.value='';if(state.selectedAttachment===file)resetAttachmentPreview();}
      loadConversations(false).catch(err=>console.warn('Conversation refresh failed',err));
    }catch(err){console.error(err);notify(err.message||'تعذر إرسال الرسالة. أعد المحاولة.','error');}
    finally{state.sending=false;if(btn){btn.disabled=false;btn.textContent=old;}}
  }

  async function findOrCreateFromQuery() {
    const params = new URLSearchParams(location.search);
    const conversationId = params.get('conversation');
    if (conversationId) return conversationId;

    const projectId = params.get('project');
    const investorId = params.get('investor');
    const ownerId = params.get('owner');
    if (!projectId || !state.user) return null;

    let project = null;
    const { data: p } = await window.supabaseClient.from('projects').select('*').eq('id', projectId).maybeSingle();
    project = p;

    const owner_auth_id = ownerId || project?.owner_auth_id || project?.user_id || (state.profile?.account_type === 'owner' ? state.user.id : null);
    const investor_auth_id = investorId || (owner_auth_id === state.user.id ? null : state.user.id);
    if (!owner_auth_id || !investor_auth_id) return null;

    const { data: existing } = await window.supabaseClient
      .from('chat_conversations')
      .select('*')
      .eq('project_id', projectId)
      .eq('owner_auth_id', owner_auth_id)
      .eq('investor_auth_id', investor_auth_id)
      .maybeSingle();
    if (existing?.id) return existing.id;

    const { data, error } = await window.supabaseClient
      .from('chat_conversations')
      .insert({
        project_id: projectId,
        owner_auth_id,
        investor_auth_id,
        project_snapshot: project ? { title: project.title, image_url: project.image_url, category: project.category, location: project.location } : {}
      })
      .select('*')
      .single();
    if (error) {
      console.warn('create conversation failed', error);
      return null;
    }
    return data.id;
  }



  function openReportDialog(conversationId) {
    const row = state.conversations.find(x => String(x.id) === String(conversationId));
    if (!row) return;
    state.reportingConversation = row;
    let modal = $('#chatReportModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'chatReportModal';
      modal.className = 'chat-report-modal';
      document.body.appendChild(modal);
    }
    modal.innerHTML = `
      <div class="chat-report-card">
        <button type="button" class="chat-report-close" data-chat-report-close>×</button>
        <span class="eyebrow">أمان المحادثة</span>
        <h3>الإبلاغ عن المحادثة</h3>
        <p>سيتم إرسال البلاغ للإدارة لمراجعة المحادثة عند الحاجة فقط.</p>
        <form id="chatReportForm">
          <label>سبب البلاغ</label>
          <select name="reason" required>
            <option value="fraud">احتيال أو محاولة نصب</option>
            <option value="spam">سبام أو رسائل مزعجة</option>
            <option value="abuse">إساءة أو تهديد</option>
            <option value="outside_payment">طلب دفع خارج المنصة</option>
            <option value="impersonation">انتحال شخصية</option>
            <option value="other">سبب آخر</option>
          </select>
          <label>ملاحظات إضافية</label>
          <textarea name="note" rows="4" placeholder="اكتب تفاصيل البلاغ هنا..." required></textarea>
          <div class="chat-report-actions">
            <button type="button" class="btn btn-outline" data-chat-report-close>إلغاء</button>
            <button type="button" class="btn btn-green" data-submit-chat-report>إرسال البلاغ</button>
            <div class="chat-report-status" id="chatReportStatus" aria-live="polite"></div>
          </div>
        </form>
      </div>`;
    modal.classList.add('open');
  }

  function closeReportDialog() {
    const modal = $('#chatReportModal');
    if (modal) modal.classList.remove('open');
  }

  async function submitChatReport(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (!window.supabaseClient && typeof window.initSupabase === 'function') window.initSupabase();
    if (!window.supabaseClient) return notify('تعذر الاتصال بقاعدة البيانات', 'error');

    const modal = $('#chatReportModal');
    const form = $('#chatReportForm', modal || document) || $('#chatReportForm');
    const statusEl = $('#chatReportStatus', modal || document);
    const btn = $('[data-submit-chat-report]', modal || document) || form?.querySelector('button[type="submit"]');
    const conv = state.reportingConversation || state.activeConversation;

    if (!conv || !state.user) return notify('اختر محادثة أولاً', 'error');
    if (!form) return notify('تعذر قراءة نموذج البلاغ', 'error');

    const fd = new FormData(form);
    const reason = String(fd.get('reason') || 'other');
    const note = String(fd.get('note') || '').trim();
    if (!note) {
      if (statusEl) statusEl.textContent = 'اكتب ملاحظة البلاغ أولاً.';
      return notify('اكتب ملاحظة البلاغ أولاً', 'error');
    }

    const old = btn?.textContent || 'إرسال البلاغ';
    const setStatus = (text) => { if (statusEl) statusEl.textContent = text || ''; };

    try {
      if (btn) { btn.disabled = true; btn.textContent = 'جاري الإرسال...'; }
      setStatus('جاري إرسال البلاغ...');

      // فحص سريع للتكرار. إذا منعت الـ RLS القراءة، نكمل الإرسال ونترك الـ UNIQUE INDEX يحمي القاعدة.
      try {
        const { data: existing, error: existingError } = await window.supabaseClient
          .from('chat_reports')
          .select('id, status')
          .eq('conversation_id', conv.id)
          .eq('reporter_auth_id', state.user.id)
          .in('status', ['open', 'under_review'])
          .limit(1);
        if (!existingError && existing && existing.length) {
          closeReportDialog();
          return notify('لديك بلاغ مفتوح بالفعل على هذه المحادثة، يرجى الانتظار حتى تتم مراجعته.', 'error');
        }
      } catch (_) {}

      const payload = {
        conversation_id: conv.id,
        reporter_auth_id: state.user.id,
        reported_auth_id: otherAuthId(conv) || null,
        project_id: conv.project_id || null,
        reason,
        note,
        status: 'open'
      };

      const { error } = await window.supabaseClient
        .from('chat_reports')
        .insert(payload);

      if (error) {
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('idx_chat_reports_one_open_per_user')) {
          closeReportDialog();
          return notify('لديك بلاغ مفتوح بالفعل على هذه المحادثة.', 'error');
        }
        throw error;
      }

      // لا نوقف نجاح البلاغ إذا فشل تحديث حالة المحادثة أو الإشعار.
      await window.supabaseClient
        .from('chat_conversations')
        .update({ is_reported: true, moderation_status: 'reported' })
        .eq('id', conv.id)
        .then(()=>{},()=>{});

      try {
        const { data: staffList } = await window.supabaseClient
          .from('admin_staff')
          .select('auth_id, role, permissions')
          .eq('is_active', true);
        const staffIds = (staffList || [])
          .filter(s => s.role === 'super_admin' || (s.permissions || []).includes('*') || (s.permissions || []).includes('chat_moderation') || (s.permissions || []).includes('support'))
          .map(s => s.auth_id)
          .filter(Boolean);
        if (staffIds.length) {
          const notifs = staffIds.map(uid => ({
            user_auth_id: uid,
            title: 'بلاغ محادثة جديد',
            message: `تم الإبلاغ عن محادثة بخصوص ${projectTitle(conv)}`,
            type: 'chat_report',
            link_url: 'admin-dashboard.html#chat_moderation',
            created_by: state.user.id
          }));
          await window.supabaseClient.from('notifications').insert(notifs).then(()=>{},()=>{});
        }
      } catch (_) {}

      closeReportDialog();
      notify('تم إرسال البلاغ للإدارة ✅');
    } catch (err) {
      console.error('chat report failed:', err);
      const message = err?.message || 'تعذر إرسال البلاغ. تأكد من تشغيل SQL الخاص ببلاغات الشات.';
      setStatus(message);
      notify(message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = old; }
    }
  }

  function sendTyping(isTyping = true) {
    if (!state.realtimeChannel || !state.activeConversation || !state.user) return;
    const now = Date.now();
    if (isTyping && now - state.lastTypingAt < 900) return;
    state.lastTypingAt = now;
    try {
      state.realtimeChannel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          conversation_id: state.activeConversation.id,
          sender_auth_id: state.user.id,
          is_typing: !!isTyping
        }
      });
    } catch (_) {}
  }

  async function initChat() {
    if (!$('[data-chat-app]')) return;
    if (!window.supabaseClient && typeof window.initSupabase === 'function') window.initSupabase();
    state.user = await getUser();
    if (!state.user) {
      $('#chatConversations').innerHTML = `<div class="chat-empty-mini">سجّل الدخول لاستخدام المحادثات.</div>`;
      $('#chatMessages').innerHTML = `<div class="chat-empty-state"><h3>تسجيل الدخول مطلوب</h3><p>الرسائل متاحة فقط للأعضاء.</p><a class="btn btn-green" href="login.html">تسجيل الدخول</a></div>`;
      return;
    }
    state.profile = await getProfile(state.user);
    await loadConversations();
    const initial = await findOrCreateFromQuery();
    if (initial) {
      await loadConversations(false);
      await openConversation(initial);
    }
  }

  document.addEventListener('click', e => {
    const openBtn = e.target.closest('[data-open-conversation]');
    if (openBtn) { e.preventDefault(); openConversation(openBtn.dataset.openConversation); return; }
    if (e.target.closest('[data-chat-refresh]')) { e.preventDefault(); loadConversations(); return; }
    if (e.target.closest('[data-chat-back]')) { document.body.classList.remove('chat-opened-mobile'); return; }
    const reportBtn = e.target.closest('[data-chat-report]');
    if (reportBtn) { e.preventDefault(); openReportDialog(reportBtn.dataset.chatReport); return; }
    if (e.target.closest('[data-submit-chat-report]')) { e.preventDefault(); submitChatReport(e); return; }
    if (e.target.closest('[data-chat-report-close]')) { e.preventDefault(); closeReportDialog(); return; }
    if (e.target.closest('[data-remove-chat-attachment]')) { e.preventDefault(); resetAttachmentPreview(); return; }
  });

  document.addEventListener('change', e => {
    if (e.target?.id === 'chatAttachmentInput') setAttachmentPreview(e.target.files?.[0] || null);
  });

  document.addEventListener('input', e => {
    if (e.target?.id === 'chatSearch') {
      state.search = e.target.value || '';
      renderConversations();
    }
    if (e.target?.id === 'chatMessageInput') {
      sendTyping(true);
      clearTimeout(e.target._typingStopTimer);
      e.target._typingStopTimer = setTimeout(() => sendTyping(false), 1800);
    }
  });

  document.addEventListener('submit', e => {
    if (e.target?.id === 'chatForm') sendMessage(e);
    if (e.target?.id === 'chatReportForm') submitChatReport(e);
  });

  window.addEventListener('beforeunload', () => { sendTyping(false); touchPresence(false); cleanupRealtime(); });
  document.addEventListener('visibilitychange', () => { touchPresence(!document.hidden); });

  window.initChat = initChat;
  if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', () => setTimeout(initChat, 50));
  else setTimeout(initChat, 50);
})();
