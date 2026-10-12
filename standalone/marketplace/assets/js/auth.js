// Authentication + user profile - fixed v7

function normalizeAccountTypeValue(type) {
  const raw = String(type || '').trim();
  const t = raw.toLowerCase();
  if (['owner', 'project_owner', 'project-owner', 'seller', 'business_owner', 'صاحب مشروع', 'صاحب المشروع'].includes(t)) return 'owner';
  if (['both', 'mixed', 'owner_investor', 'investor_owner', 'مستثمر وصاحب مشروع', 'صاحب مشروع ومستثمر'].includes(t)) return 'both';
  return 'investor';
}


function getSafeNextUrl(defaultUrl='user-dashboard.html'){
 const next=new URLSearchParams(location.search).get('next');if(!next)return defaultUrl;
 try{const url=new URL(next,location.href);const allowed=['index.html','opportunities.html','project-details.html','user-dashboard.html','workspace.html','find-project.html','compare.html','plans.html','payments.html','owner-leads.html','my-interests.html','chat.html','add-project.html','verification.html','edit-my-project.html'];
 if(url.origin!==location.origin||!allowed.includes(url.pathname.split('/').pop()))return defaultUrl;
 return url.pathname+url.search+url.hash;
 }catch{return defaultUrl;}
}

function ensureSupabaseReady() {
  if (!window.supabase) {
    throw new Error('مكتبة Supabase غير محملة. تأكد من الاتصال بالإنترنت.');
  }
  if (!window.supabaseClient && typeof window.initSupabase === 'function') {
    window.initSupabase();
  }
  if (!window.supabaseClient) {
    throw new Error('فشل تهيئة Supabase Client.');
  }
  return window.supabaseClient;
}

async function withTimeout(promise,ms=15000){let timer;try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('انتهت مهلة الاتصال. تحقق من الإنترنت وأعد المحاولة.')),ms);})]);}finally{clearTimeout(timer);}}

async function getSessionUser() {
  const client = ensureSupabaseReady();
  const { data, error } = await client.auth.getUser();
  if (error) {
    if(['session_not_found','refresh_token_not_found','refresh_token_already_used'].includes(error.code)||error.status===401)return null;
    throw error;
  }
  return data?.user || null;
}

async function ensureUserProfile() {
  const client = ensureSupabaseReady();
  const user = await getSessionUser();
  if (!user) return null;

  const { data: existing, error: existingError } = await client
    .from('users')
    .select('*')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }
  if (existing) return existing;

  const meta = user.user_metadata || {};
  const payload = {
    auth_id: user.id,
    name: meta.name || user.email || 'مستخدم',
    email: user.email,
    phone: meta.phone || '',
    whatsapp: meta.whatsapp || '',
    account_type: normalizeAccountTypeValue(meta.account_type || 'investor'),
    role: 'user',
    plan: 'free',
    subscription_status: 'free',
    remaining_projects: 1,
    featured_projects: 0,
    free_project_used: false,
    is_blocked: false
  };

  const { data, error } = await client
    .from('users')
    .insert([payload])
    .select()
    .single();

  if (error) {
    console.error('create profile error:', error);
    return null;
  }
  return data;
}

async function getUserProfile() {
  return await ensureUserProfile();
}

async function registerUser(form) {
  if(form.dataset.submitting==='1'||!form.reportValidity())return;
  if((form.querySelector("[name=password]")?.value||'').length<8){alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل');return;}
  const client = ensureSupabaseReady();
  const name = form.querySelector("[name='name']")?.value.trim() || '';
  const email = form.querySelector("[name='email']")?.value.trim() || '';
  const phone = form.querySelector("[name='phone']")?.value.trim() || '';
  const whatsapp = form.querySelector("[name='whatsapp']")?.value.trim() || '';
  const accountType = normalizeAccountTypeValue(form.querySelector("[name='account_type']")?.value || 'investor');
  const password = form.querySelector("[name='password']")?.value || '';

  if (!name || !email || !password || !accountType) {
    alert('يرجى تعبئة البيانات المطلوبة');
    return;
  }

  const btn = form.querySelector("button[type='submit']");
  const oldText = btn ? btn.textContent : '';
  try {
    form.dataset.submitting='1';
    if (btn) { btn.disabled = true; btn.textContent = 'جاري إنشاء الحساب...'; }

    const { data, error } = await withTimeout(client.auth.signUp({
      email,
      password,
      options: { data: { name, phone, whatsapp, account_type: accountType } }
    }));

    if (error) throw error;

    if(data?.session){await ensureUserProfile();}

    alert('تم إنشاء الحساب بنجاح ✅ إذا طلب منك تأكيد البريد، افتح الإيميل ثم سجّل دخول.');
    location.href = 'login.html' + (new URLSearchParams(location.search).get('next') ? ('?next=' + encodeURIComponent(getSafeNextUrl())) : '');
  } catch (error) {
    alert(error.message || 'حدث خطأ أثناء إنشاء الحساب');
    console.error(error);
  } finally {
    form.dataset.submitting='0';
    if (btn) { btn.disabled = false; btn.textContent = oldText || 'إنشاء الحساب'; }
  }
}

async function loginUser(form) {
  const client = ensureSupabaseReady();
  const email = form.querySelector("[name='email']")?.value.trim() || '';
  const password = form.querySelector("[name='password']")?.value || '';

  if (!email || !password) {
    alert('أدخل البريد وكلمة المرور');
    return;
  }

  const btn = form.querySelector("button[type='submit']");
  const oldText = btn ? btn.textContent : '';

  try {
    const attemptKey = 'alo_login_attempts';
    const attempts = JSON.parse(sessionStorage.getItem(attemptKey) || '{\"count\":0,\"ts\":0}');
    if (attempts.count >= 5 && Date.now() - attempts.ts < 5 * 60 * 1000) {
      alert('محاولات كثيرة. انتظر 5 دقائق ثم حاول مرة أخرى.');
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الدخول...'; }

    const { data, error } = await withTimeout(client.auth.signInWithPassword({ email, password }));
    if (error) throw error;

    sessionStorage.removeItem('alo_login_attempts');
    // إنشاء/جلب البروفايل بدون تعليق الدخول إذا فشل
    try { await ensureUserProfile(); } catch (profileErr) { console.error('profile after login:', profileErr); }

    window.location.href = getSafeNextUrl('user-dashboard.html');
  } catch (error) {
    try {
      const attemptKey = 'alo_login_attempts';
      const attempts = JSON.parse(sessionStorage.getItem(attemptKey) || '{\"count\":0,\"ts\":0}');
      sessionStorage.setItem(attemptKey, JSON.stringify({ count: Number(attempts.count || 0) + 1, ts: Date.now() }));
    } catch {}
    alert(error.message || 'فشل تسجيل الدخول');
    console.error(error);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = oldText || 'دخول'; }
  }
}

async function sendPasswordResetEmail(email, statusEl, btn) {
  email = String(email || '').trim();
  if (!email) throw new Error('أدخل البريد الإلكتروني أولاً.');

  const client = ensureSupabaseReady();
  const redirectTo = new URL('reset-password.html', window.location.href).href;
  const { error } = await withTimeout(client.auth.resetPasswordForEmail(email, { redirectTo }));
  if (error) throw error;

  const msg = 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني ✅ إذا لم يصلك الرابط تأكد من مجلد Spam ومن إعداد Redirect URLs في Supabase.';
  if (statusEl) {
    statusEl.style.display = 'block';
    statusEl.style.color = 'var(--green)';
    statusEl.textContent = msg;
  } else {
    alert(msg);
  }
}

async function handleForgotPasswordForm(form) {
  const email = form.querySelector("[name='email']")?.value?.trim() || '';
  const btn = form.querySelector("button[type='submit']");
  const statusEl = form.querySelector('[data-forgot-password-message]') || document.querySelector('[data-forgot-password-message]');
  const oldText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'جاري إرسال الرابط...'; }
    if (statusEl) { statusEl.style.display = 'block'; statusEl.style.color = ''; statusEl.textContent = 'جاري الإرسال...'; }
    await sendPasswordResetEmail(email, statusEl, btn);
  } catch (error) {
    console.error(error);
    if (statusEl) {
      statusEl.style.display = 'block';
      statusEl.style.color = '#b42318';
      statusEl.textContent = error.message || 'تعذر إرسال رابط إعادة تعيين كلمة المرور';
    } else {
      alert(error.message || 'تعذر إرسال رابط إعادة تعيين كلمة المرور');
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = oldText || 'إرسال رابط الاستعادة'; }
  }
}

async function handleForgotPasswordClick(e) {
  // نسخة احتياطية فقط للروابط القديمة. الرابط الجديد يفتح forgot-password.html.
  e.preventDefault();
  window.location.href = 'forgot-password.html';
}

async function prepareResetPasswordSession() {
  if (!document.querySelector('[data-reset-password-form]')) return;
  const client = ensureSupabaseReady();

  try {
    // Supabase قد يرجع الرابط بصيغة ?code=... أو بصيغة hash فيها access_token.
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      const { error } = await withTimeout(client.auth.exchangeCodeForSession(window.location.href));
      if (error) throw error;
      history.replaceState({}, document.title, window.location.pathname);
      return;
    }

    const hash = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    if (accessToken && refreshToken) {
      const { error } = await withTimeout(client.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }));
      if (error) throw error;
      history.replaceState({}, document.title, window.location.pathname);
      return;
    }
  } catch (error) {
    console.error(error);
    alert('رابط الاستعادة غير صالح أو منتهي. اطلب رابط جديد من صفحة تسجيل الدخول.');
  }
}

async function updateUserPassword(form) {
  const password = form.querySelector("[name='password']")?.value || '';
  const confirm = form.querySelector("[name='confirm_password']")?.value || '';
  if (!password || password.length < 6) { alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل.'); return; }
  if (password !== confirm) { alert('كلمتا المرور غير متطابقتين.'); return; }
  const btn = form.querySelector("button[type='submit']");
  const oldText = btn ? btn.textContent : '';
  try {
    const client = ensureSupabaseReady();
    if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; }
    const { error } = await withTimeout(client.auth.updateUser({ password }));
    if (error) throw error;
    alert('تم تغيير كلمة المرور بنجاح ✅');
    location.href = 'login.html';
  } catch (error) {
    console.error(error);
    alert(error.message || 'تعذر تغيير كلمة المرور. افتح الرابط من البريد مرة أخرى.');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = oldText || 'حفظ كلمة المرور'; }
  }
}

async function logoutUser() {
  const client = ensureSupabaseReady();
  await client.auth.signOut();
  location.href = 'login.html';
}

async function initProfileForm() {
  const form = document.querySelector('[data-profile-form]');
  if (!form || form.dataset.profileReady === '1') return;
  form.dataset.profileReady = '1';

  const profile = await getUserProfile();
  if (!profile) return;

  if (form.name) form.name.value = profile.name || '';
  if (form.phone) form.phone.value = profile.phone || '';
  if (form.whatsapp) form.whatsapp.value = profile.whatsapp || '';
  if (form.account_type) form.account_type.value = normalizeAccountTypeValue(profile.account_type) || 'investor';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const oldText = btn ? btn.textContent : '';
    try {
      if (btn) { btn.disabled = true; btn.textContent = 'جاري الحفظ...'; }
      const user = await getSessionUser();
      if (!user) throw new Error('يجب تسجيل الدخول أولاً');
      const payload = {
        name: form.name?.value || '',
        phone: form.phone?.value || '',
        whatsapp: form.whatsapp?.value || '',
        account_type: normalizeAccountTypeValue(form.account_type?.value || 'investor')
      };
      const { error } = await ensureSupabaseReady().from('users').update(payload).eq('auth_id', user.id);
      if (error) throw error;
      alert('تم حفظ البيانات ✅');
      if (typeof window.loadUserDashboard === 'function') window.loadUserDashboard();
    } catch (error) {
      alert(error.message || 'فشل حفظ البيانات');
      console.error(error);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = oldText || 'حفظ البيانات'; }
    }
  });
}

// expose globals
window.normalizeAccountTypeValue = normalizeAccountTypeValue;
window.getSessionUser = getSessionUser;
window.ensureUserProfile = ensureUserProfile;
window.getUserProfile = getUserProfile;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.handleForgotPasswordClick = handleForgotPasswordClick;
window.handleForgotPasswordForm = handleForgotPasswordForm;
window.sendPasswordResetEmail = sendPasswordResetEmail;
window.updateUserPassword = updateUserPassword;
window.prepareResetPasswordSession = prepareResetPasswordSession;
window.initProfileForm = initProfileForm;

// Explicit forms only. لا نمسك أي فورم فيه email/password حتى لا نخرب صفحات ثانية.
document.addEventListener('submit', async function (e) {
  const form = e.target;
  if (form.matches('[data-login-form]') || form.matches('#loginForm')) {
    e.preventDefault();
    await loginUser(form);
    return;
  }
  if (form.matches('[data-register-form]') || form.matches('#registerForm')) {
    e.preventDefault();
    await registerUser(form);
    return;
  }
  if (form.matches('[data-forgot-password-form]')) {
    e.preventDefault();
    await handleForgotPasswordForm(form);
    return;
  }
  if (form.matches('[data-reset-password-form]')) {
    e.preventDefault();
    await updateUserPassword(form);
    return;
  }
});


document.addEventListener('click', async function(e){
  const forgot = e.target.closest('[data-forgot-password]');
  if (forgot) {
    await handleForgotPasswordClick(e);
  }
});

document.addEventListener('DOMContentLoaded', function(){
  // app.js يحمّل auth.js بعد DOMContentLoaded أحياناً، لذلك ننفذ مباشرة أيضاً عبر app-init إن وجد.
  prepareResetPasswordSession().catch(console.error);
});
