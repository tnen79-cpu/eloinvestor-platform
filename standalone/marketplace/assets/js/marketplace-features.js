// Alo Investor Marketplace UX + smart features v39
(function(){
  const DEFAULT_IMG='https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const {norm,roi,verified:safeStatus,filters:parseFilters,matches:matchProject,sort:sortProjects,filterKeys}=window.AloMarket;
  const money=v=>{const n=window.AloMarket.num(v);return n!==null&&n>0?n.toLocaleString('en-OM')+' ر.ع':'غير محدد'};
  const approved=['approved','active','published'];
  function img(p){return p.image_url||p.cover_image||p.thumbnail||DEFAULT_IMG}
  function catLabel(c){return ({restaurants:'مطاعم ومقاهي',tech:'تقنية',commerce:'تجارة',services:'خدمات',contracting:'مقاولات',realestate:'عقارات'})[window.AloMarket.category(c)]||c||'استثمار'}
  function projectUrl(id){return `project-details.html?id=${encodeURIComponent(id||'')}`}
  function actionOwner(p){return p.owner_auth_id||p.user_auth_id||p.auth_id||p.created_by||p.user_id||''}

  window.aloMoney=money; window.aloProjectRoi=roi;

  window.projectCard = function projectCard(p){
    const r=roi(p), verified=safeStatus(p), hot=Number(p.contacts_count||0)>3 || Number(p.views_count||0)>100 || p.is_hot;
    const wa=(typeof normalizeWhatsapp==='function')?normalizeWhatsapp(p.whatsapp):String(p.whatsapp||'').replace(/\D/g,'');
    const chatHref=`chat.html?project=${encodeURIComponent(p.id||'')}&owner=${encodeURIComponent(actionOwner(p))}`;
    return `<article class="market-card" data-project-id="${esc(p.id)}" data-category="${esc(p.category)}" data-location="${esc(p.location)}">
      <a class="market-card-image" href="${projectUrl(p.id)}" aria-label="${esc(p.title||'تفاصيل المشروع')}">
        <img src="${esc(img(p))}" alt="${esc(p.title||'صورة المشروع')}" loading="lazy">
        <div class="market-badges">${verified?'<span class="badge badge-green">موثق ✓</span>':''}${hot?'<span class="badge badge-hot">فرصة ساخنة 🔥</span>':''}<span class="badge badge-light">${esc(catLabel(p.category||p.type))}</span></div>
      </a>
      <button type="button" class="save-float" data-save-card="${esc(p.id)}" aria-label="حفظ المشروع">♡</button>
      <div class="market-card-body">
        <a class="market-title" href="${projectUrl(p.id)}">${esc(p.title||'مشروع استثماري')}</a>
        <div class="market-sub"><span>📍 ${esc(p.location||'غير محدد')}</span><span>🏷️ ${esc(catLabel(p.category||p.type))}</span></div>
        <div class="market-metrics">
          <div><span>عائد سنوي تقديري</span><b class="green-number">${r===null?'غير متاح':r+'%'}</b></div>
          <div><span>سعر المشروع</span><b>${money(p.price)}</b></div>
        </div>
        <p class="financial-caption">بحسب بيانات المعلن · ليس ضماناً للعائد</p>
        <button type="button" class="compare-choice" data-compare-project="${esc(p.id)}" aria-pressed="false">+ أضف للمقارنة</button>
        <div class="market-actions">
          <a class="btn-chat" href="${chatHref}">دردشة</a>
          <a class="btn-call" href="${projectUrl(p.id)}#contact" data-gated-contact="${esc(p.id)}">اتصال</a>
        </div>
      </div>
    </article>`;
  };

  let allRows=null, loading=null, page=1;
  const pageSize=12;
  const readFilters=()=>parseFilters(new URL(location.href).searchParams);
  function syncForms(){
    const f=readFilters();
    document.querySelectorAll('[data-market-search]').forEach(form=>form.querySelectorAll('[name]').forEach(el=>{
      if(!filterKeys.includes(el.name)) return;
      if(el.type==='checkbox')el.checked=f[el.name]==='1';else el.value=f[el.name]||'';
    }));
  }
  function renderProjects(){
    const rows=sortProjects((allRows||[]).filter(p=>matchProject(p,readFilters())),readFilters().sort);
    document.querySelectorAll('[data-results-count]').forEach(el=>el.textContent=String(rows.length));
    const pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(page,pages);
    document.querySelectorAll('[data-project-list]').forEach(c=>{
      const home=c.dataset.projectList==='home';
      const visible=home?rows.slice(0,Number(c.dataset.limit||4)):rows.slice((page-1)*pageSize,page*pageSize);
      c.setAttribute('aria-busy','false');
      c.innerHTML=visible.map(window.projectCard).join('')||'<div class="empty-state"><b>لا توجد فرص مطابقة</b><p>جرّب تعديل البحث أو الفلاتر.</p><a class="btn btn-outline" href="opportunities.html">عرض كل الفرص</a></div>';
    });
    const pager=document.querySelector('[data-market-pages]');
    if(pager){pager.innerHTML=pages>1?`<button class="btn btn-outline" data-page="${page-1}" ${page===1?'disabled':''}>السابق</button><span>صفحة ${page} من ${pages}</span><button class="btn btn-outline" data-page="${page+1}" ${page===pages?'disabled':''}>التالي</button>`:'';pager.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page=Number(b.dataset.page);renderProjects();document.querySelector('[data-project-list]').scrollIntoView({block:'start',behavior:'smooth'});});}
    window.AloCompare?.refresh(); bindCardActions();
  }
  window.loadMarketplaceProjects = async function loadMarketplaceProjects(force=false){
    const containers=document.querySelectorAll('[data-project-list]');if(!containers.length)return;
    setupSearchForms();
    if(!window.supabaseClient)return;
    if(allRows&&!force){renderProjects();return;}
    if(loading)return loading;
    containers.forEach(c=>{c.setAttribute('aria-busy','true');c.innerHTML='<div class="empty-state" role="status">جاري تحميل الفرص...</div>';});
    loading=(async()=>{
      try{
        // Fetch ranges explicitly so Supabase's default row cap does not hide results.
        let rows=[],offset=0;
        while(true){
          const {data,error}=await window.supabaseClient.from('marketplace_projects').select('*').in('status',approved).order('created_at',{ascending:false}).order('id',{ascending:true}).range(offset,offset+499);
          if(error)throw error;
          rows.push(...(data||[]));if(!data||data.length<500)break;offset+=500;
        }
        allRows=rows;document.dispatchEvent(new CustomEvent('alo:market-loaded',{detail:{rows}}));renderProjects();renderHotProjects(rows);updateHomeStats(rows);loadLiveActivity(rows);
      }catch(e){
        console.warn('projects load failed',e);
        containers.forEach(c=>{c.setAttribute('aria-busy','false');c.innerHTML='<div class="empty-state" role="alert"><b>تعذر تحميل الفرص</b><p>تحقق من الاتصال وحاول مرة أخرى.</p><button class="btn btn-green" data-retry-market>إعادة المحاولة</button></div>';c.querySelector('[data-retry-market]').onclick=()=>window.loadMarketplaceProjects(true);});
        document.querySelectorAll('[data-results-count]').forEach(el=>el.textContent='—');
      }finally{loading=null;}
    })();return loading;
  };

  function renderHotProjects(rows){
    const box=document.querySelector('[data-hot-projects]'); if(!box) return;
    const hot=sortProjects(rows,'hot').slice(0,6);
    box.innerHTML=hot.map(p=>`<a class="hot-mini-card" href="${projectUrl(p.id)}"><img src="${esc(img(p))}" loading="lazy"><div><b>${esc(p.title||'فرصة')}</b><span>${roi(p)===null?'غير متاح':roi(p)+'%'} · ${money(p.price)}</span></div></a>`).join('') || '<p class="muted">لا توجد فرص ساخنة حالياً.</p>';
  }

  async function saveProject(projectId,btn){
    try{
      const user=await getSessionUser?.(); if(!user){location.href='login.html?next='+encodeURIComponent(location.pathname+location.search);return;}
      btn && (btn.disabled=true);
      await window.AloInvestor.saveProject((allRows||[]).find(p=>String(p.id)===String(projectId))||{id:projectId});
      if(btn){btn.textContent='♥';btn.classList.add('saved');btn.disabled=false;}
      toast('تم حفظ المشروع');
    }catch(e){console.warn(e); toast('تعذر حفظ المشروع. حاول مرة أخرى.'); if(btn)btn.disabled=false;}
  }
  function bindCardActions(){
    document.querySelectorAll('[data-save-card]:not([data-bound])').forEach(btn=>{btn.dataset.bound='1';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();saveProject(btn.dataset.saveCard,btn);});});
    document.querySelectorAll('[data-gated-contact]:not([data-bound])').forEach(btn=>{btn.dataset.bound='1';btn.addEventListener('click',async e=>{const user=await getSessionUser?.(); if(!user){e.preventDefault(); location.href='login.html?next='+encodeURIComponent(btn.getAttribute('href')||location.pathname);}});});
  }


  async function updateHomeStats(rows){
    const box=document.querySelector('[data-home-stats]'); if(!box) return;
    const fmt=n=>Number(n||0).toLocaleString('en-OM');
    const volume=rows.reduce((sum,p)=>sum+Number(p.price||0),0);
    const verified=rows.filter(safeStatus).length;
    box.querySelector('[data-stat-projects]') && (box.querySelector('[data-stat-projects]').textContent='+'+fmt(rows.length));
    box.querySelector('[data-stat-volume]') && (box.querySelector('[data-stat-volume]').textContent=volume>=1000000?Math.round(volume/1000000)+'M+':fmt(volume));
    box.querySelector('[data-stat-verified]') && (box.querySelector('[data-stat-verified]').textContent=rows.length?Math.round((verified/rows.length)*100)+'%':'0%');
    const categories=new Set(rows.map(p=>window.AloMarket.category(p.category)).filter(Boolean));
    box.querySelector('[data-stat-investors]') && (box.querySelector('[data-stat-investors]').textContent=fmt(categories.size));
  }

  async function loadLiveActivity(rows){
    const box=document.querySelector('[data-live-activity]'); if(!box) return;
    const items=(rows||[]).slice(0,4).map(p=>`تمت إضافة فرصة ${esc(p.title||'استثمارية')} في ${esc(p.location||'المنصة')}`);
    box.innerHTML=items.length?items.map(x=>`<div>${x}</div>`).join(''):'<div class="muted">لا يوجد نشاط جديد حالياً.</div>';
  }

  function setupSearchForms(){
    document.querySelectorAll('[data-market-search]').forEach(form=>{
      if(form.dataset.searchBound)return;form.dataset.searchBound='1';
      form.addEventListener('submit',e=>{
        e.preventDefault();if(!form.reportValidity())return;
        const u=new URL('opportunities.html',location.href);
        // Start with active URL filters, then merge every visible form; unchecked clears verified.
        const active=readFilters();filterKeys.forEach(k=>{if(active[k])u.searchParams.set(k,active[k]);});
        document.querySelectorAll('[data-market-search]').forEach(f=>f.querySelectorAll('[name]').forEach(el=>{
          if(!filterKeys.includes(el.name))return;
          const v=el.type==='checkbox'?(el.checked?'1':''):el.value.trim();
          if(v)u.searchParams.set(el.name,v);else u.searchParams.delete(el.name);
        }));
        const min=Number(u.searchParams.get('min')||0),max=u.searchParams.get('max');
        if(max!==null&&Number(max)<min){toast('السعر الأعلى يجب أن يكون أكبر من السعر الأدنى');return;}
        const lang=new URL(location.href).searchParams.get('lang');if(lang)u.searchParams.set('lang',lang);
        if(location.pathname.endsWith('opportunities.html')){history.pushState({},'',u.pathname+u.search);page=1;window.loadMarketplaceProjects();}
        else location.href=u.pathname+u.search;
      });
    });syncForms();
  }
  window.addEventListener('popstate',()=>{syncForms();page=1;window.loadMarketplaceProjects();});

  const AD_PLACEMENTS = new Set(['home_top','home_middle','opportunities_top','project_details_mid','project_sidebar','plans_top','dashboard_top']);

  function normalizePlacement(value){
    const p = String(value || '').trim();
    return AD_PLACEMENTS.has(p) ? p : '';
  }

  function isAdActiveNow(ad){
    const now = Date.now();
    const starts = ad.starts_at ? new Date(ad.starts_at).getTime() : 0;
    const ends = (ad.ends_at || ad.expires_at) ? new Date(ad.ends_at || ad.expires_at).getTime() : 0;
    return ad.is_active !== false && (!starts || starts <= now) && (!ends || ends >= now);
  }

  async function fetchAdsByPlacement(placement){
    const safePlacement = normalizePlacement(placement);
    if(!window.supabaseClient || !safePlacement) return [];
    try{
      const {data,error}=await window.supabaseClient
        .from('platform_ads')
        .select('*')
        .eq('is_active',true)
        .eq('placement',safePlacement)
        .order('sort_order',{ascending:true})
        .order('created_at',{ascending:false})
        .limit(12);
      if(error) throw error;
      return (data || []).filter(isAdActiveNow);
    }catch(e){
      console.warn('ads load failed for placement:', safePlacement, e.message || e);
      return [];
    }
  }

  function clearAdBox(box){
    if (box._adTimer) { clearInterval(box._adTimer); box._adTimer = null; box.dataset.adAuto = ''; }
    box.innerHTML = '';
    box.hidden = true;
    box.classList.add('is-empty-ad');
  }

  function renderAdBox(box,ads,placement){
    const safePlacement = normalizePlacement(placement);
    if(!safePlacement || !ads.length) return clearAdBox(box);
    box.hidden = false;
    box.classList.remove('is-empty-ad');
    const slider=box.hasAttribute('data-ad-slider') || ads.length>1;
    const showControls = slider && ads.length > 1;
    let idx=0;
    function render(){
      const ad=ads[idx%ads.length];
      const href=ad.link_url||'#';
      const image = ad.image_url || ad.image || ad.banner_url || '';
      if(!image) return clearAdBox(box);
      const adDesc = ad.subtitle || ad.description || '';
      const titleHtml = ad.title ? `<h3>${esc(ad.title)}</h3>` : '';
      const descHtml = adDesc ? `<p>${esc(adDesc)}</p>` : '';
      const buttonHtml = ad.button_text ? `<span>${esc(ad.button_text)}</span>` : '';
      const textHtml = (ad.title || adDesc || ad.button_text) ? `<div><small>${esc(ad.placement_label||'إعلان')}</small>${titleHtml}${descHtml}${buttonHtml}</div>` : '<div class="ad-empty-copy"><small>إعلان</small></div>';
      box.innerHTML=`<a class="ad-slide ${slider?'':'ad-single'}" href="${esc(href)}"><img src="${esc(image)}" loading="lazy" alt="${esc(ad.title||'إعلان')}">${textHtml}</a>${showControls?`<button class="ad-next" type="button" data-ad-next aria-label="الإعلان التالي">›</button><button class="ad-prev" type="button" data-ad-prev aria-label="الإعلان السابق">‹</button><div class="ad-dots">${ads.map((_,i)=>`<i class="${i===idx?'active':''}"></i>`).join('')}</div>`:''}`;
      const next=box.querySelector('[data-ad-next]'), prev=box.querySelector('[data-ad-prev]');
      if(next) next.onclick=()=>{idx=(idx+1)%ads.length;render();};
      if(prev) prev.onclick=()=>{idx=(idx-1+ads.length)%ads.length;render();};
    }
    render();
    if(showControls){
      if(!box.dataset.adAuto){ box.dataset.adAuto='1'; box._adTimer=setInterval(()=>{idx=(idx+1)%ads.length;render();},6500); }
      let touchStartX=0, touchStartY=0;
      box.ontouchstart=(ev)=>{ const t=ev.touches && ev.touches[0]; if(!t) return; touchStartX=t.clientX; touchStartY=t.clientY; };
      box.ontouchend=(ev)=>{ const t=ev.changedTouches && ev.changedTouches[0]; if(!t) return; const dx=t.clientX-touchStartX; const dy=t.clientY-touchStartY; if(Math.abs(dx)>45 && Math.abs(dx)>Math.abs(dy)){ idx = dx > 0 ? (idx+1)%ads.length : (idx-1+ads.length)%ads.length; render(); } };
    } else {
      box.ontouchstart=null; box.ontouchend=null;
    }
  }

  window.loadPlatformAds = async function loadAds(){
    const boxes=[...document.querySelectorAll('[data-ad-slider], [data-ad-placement]')];
    if(!boxes.length) return;
    for(const box of boxes){
      const placement=box.dataset.adPlacement || 'home_top';
      const ads=await fetchAdsByPlacement(placement);
      renderAdBox(box,ads,placement);
    }
  }

  function toast(msg){let t=document.querySelector('.alo-toast'); if(!t){t=document.createElement('div');t.className='alo-toast';document.body.appendChild(t);} t.textContent=msg;t.classList.add('show');clearTimeout(t._timer);t._timer=setTimeout(()=>t.classList.remove('show'),2500);}

  async function setupInterestButton(){
    const btn=document.querySelector('[data-interest-project]'); if(!btn || btn.dataset.interestReady === '1') return;
    btn.dataset.interestReady='1';
    btn.addEventListener('click',async()=>{
      const id=(new URLSearchParams(location.search)).get('id');
      if(!id){ toast('لم يتم العثور على رقم المشروع'); return; }
      const user=await window.getSessionUser?.();
      if(!user){location.href='login.html?next='+encodeURIComponent(location.pathname+location.search);return;}
      const old=btn.textContent;
      btn.disabled=true; btn.textContent='جاري تسجيل الاهتمام...';
      try{
        const { error } = await window.supabaseClient.from('project_interests').upsert({project_id:id,investor_auth_id:user.id,status:'interested'},{onConflict:'project_id,investor_auth_id'});
        if(error) throw error;
        btn.textContent='تم تسجيل اهتمامك ✅';
        toast('وصل اهتمامك لصاحب المشروع');
      }
      catch(e){console.warn(e); toast('تعذر تسجيل الاهتمام. شغّل SQL v50.'); btn.disabled=false; btn.textContent=old;}
    });
  }

  document.addEventListener('alo:language-applied',()=>{if(allRows)renderProjects();});
  setupSearchForms();
  window.AloCompare?.refresh();
})();
