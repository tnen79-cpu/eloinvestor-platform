
(function(){
  function waitForConfig(timeoutMs=8000){
    return new Promise(resolve=>{
      const started=Date.now();
      (function tick(){
        const url=(typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : window.SUPABASE_URL);
        const key=(typeof SUPABASE_KEY !== 'undefined' ? SUPABASE_KEY : window.SUPABASE_KEY);
        if(url && key) return resolve({url,key});
        if(Date.now()-started>timeoutMs) return resolve(null);
        setTimeout(tick,50);
      })();
    });
  }
  async function loadSupabase(){
    if(window.supabase) return;
    const existing=document.querySelector('script[src*="@supabase/supabase-js"]');
    if(existing){ await new Promise((resolve,reject)=>{existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});}); return; }
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
  }
  async function guard(){
    try{
      const cfg=await waitForConfig();
      if(!cfg) throw new Error('Supabase config missing');
      await loadSupabase();
      const client=window.supabaseClient || window.supabase.createClient(cfg.url,cfg.key);
      window.supabaseClient=client;
      const {data}=await client.auth.getUser();
      const user=data&&data.user;
      if(!user){location.replace('login.html?next='+encodeURIComponent(location.pathname+location.search));return;}
      let ok=false;
      try{const r=await client.from('admin_staff').select('id').eq('auth_id',user.id).eq('is_active',true).maybeSingle(); ok=!!r.data;}catch(e){}
      if(!ok){try{const r=await client.from('users').select('role').eq('auth_id',user.id).maybeSingle(); ok=r.data&&r.data.role==='admin';}catch(e){}}
      if(!ok){document.body.innerHTML='<main class="container page"><section class="panel"><h1>غير مصرح</h1><p>هذه الصفحة مخصصة للمشرفين فقط.</p><a class="btn btn-green" href="index.html">العودة للرئيسية</a></section></main>';document.documentElement.classList.add('admin-guard-ready');return;}
      document.documentElement.classList.add('admin-guard-ready');
    }catch(e){console.error('admin guard failed',e);document.body.innerHTML='<main class="container page"><section class="panel"><h1>تعذر التحقق من الإدارة</h1><p>أعد تحميل الصفحة أو تحقق من إعدادات Supabase.</p><a class="btn btn-green" href="login.html">تسجيل الدخول</a></section></main>';document.documentElement.classList.add('admin-guard-ready');}
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',guard); else guard();
})();
