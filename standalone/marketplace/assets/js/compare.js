(function(){
  const key='alo_compare_v73',esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const en={'قارن المشاريع':'Compare businesses','إلغاء الاختيار':'Clear selection','أضف للمقارنة':'+ Compare','تمت الإضافة':'Selected','اختر مشروعين أو ثلاثة للمقارنة':'Choose two or three businesses to compare','يمكن مقارنة 3 مشاريع كحد أقصى':'You can compare up to 3 businesses','الموقع':'Location','المجال':'Sector','نوع الفرصة':'Opportunity type','السعر المطلوب':'Asking price','صافي الربح الشهري المعلن':'Reported monthly net profit','عائد سنوي تقديري':'Estimated annual return','التوثيق':'Verification','موثق':'Verified','غير موثق':'Not verified','غير متاح':'Not available','تفاصيل المشروع':'Business details','تعذر تحميل المقارنة':'Could not load comparison','بعض المشاريع لم تعد متاحة للنشر':'Some selected businesses are no longer public','جاري تحميل المقارنة...':'Loading comparison...'};
  const t=s=>document.documentElement.lang==='en'?(en[s]||s):s;
  function read(){try{const x=JSON.parse(sessionStorage.getItem(key)||'[]');return Array.isArray(x)?[...new Set(x.filter(i=>typeof i==='string'))].slice(0,3):[];}catch{return [];}}
  let ids=read();
  function persist(){try{sessionStorage.setItem(key,JSON.stringify(ids));}catch{}}
  function href(){const u=new URL('compare.html',location.href);u.searchParams.set('ids',ids.join(','));const l=new URL(location.href).searchParams.get('lang');if(l)u.searchParams.set('lang',l);return u.pathname+u.search;}
  function refresh(){
    const cards=document.querySelectorAll('[data-compare-project]');
    cards.forEach(b=>{const selected=ids.includes(b.dataset.compareProject);b.setAttribute('aria-pressed',String(selected));b.textContent=selected?'✓ '+t('تمت الإضافة'):t('أضف للمقارنة');});
    let tray=document.querySelector('[data-compare-tray]');
    if(!tray&&cards.length){tray=document.createElement('aside');tray.dataset.compareTray='';tray.className='compare-tray';tray.setAttribute('aria-label',t('قارن المشاريع'));document.body.appendChild(tray);}
    if(!tray)return;tray.hidden=!ids.length;
    tray.innerHTML=`<span role="status">${ids.length} / 3 · ${esc(t('قارن المشاريع'))}</span><a class="btn btn-green" href="${esc(href())}" ${ids.length<2?'aria-disabled="true" tabindex="-1"':''}>${esc(t('قارن المشاريع'))}</a><button class="btn btn-outline" data-clear-compare>${esc(t('إلغاء الاختيار'))}</button>`;
    tray.querySelector('[data-clear-compare]').onclick=()=>{ids=[];persist();refresh();};
    tray.querySelector('a').onclick=e=>{if(ids.length<2){e.preventDefault();announce(t('اختر مشروعين أو ثلاثة للمقارنة'));}};
  }
  function announce(message){let el=document.querySelector('[data-compare-message]');if(!el){el=document.createElement('div');el.dataset.compareMessage='';el.className='compare-message';el.setAttribute('role','status');document.body.appendChild(el);}el.textContent=message;clearTimeout(el._timer);el._timer=setTimeout(()=>el.remove(),3000);}
  document.addEventListener('click',e=>{const b=e.target.closest('[data-compare-project]');if(!b)return;
    const id=b.dataset.compareProject;if(!id)return;
    if(ids.includes(id))ids=ids.filter(i=>i!==id);else if(ids.length<3)ids.push(id);else {announce(t('يمكن مقارنة 3 مشاريع كحد أقصى'));return;}
    persist();refresh();
  });
  let comparisonRows=null;
  function renderTable(box,rows){
    if(rows.length<2){box.innerHTML=`<div class="empty-state">${esc(t('اختر مشروعين أو ثلاثة للمقارنة'))}<p><a class="btn btn-green" href="opportunities.html">${document.documentElement.lang==='en'?'Browse businesses':'تصفح الفرص'}</a></p></div>`;return;}
    const M=window.AloMarket,amount=v=>M.num(v)!==null?Number(v).toLocaleString('en-OM')+' OMR':t('غير متاح');
    const fields=[['الموقع',p=>p.location||t('غير متاح')],['المجال',p=>({restaurants:document.documentElement.lang==='en'?'Restaurants & cafes':'مطاعم ومقاهي',tech:document.documentElement.lang==='en'?'Technology':'تقنية',commerce:document.documentElement.lang==='en'?'Commerce':'تجارة',services:document.documentElement.lang==='en'?'Services':'خدمات',contracting:document.documentElement.lang==='en'?'Contracting':'مقاولات',realestate:document.documentElement.lang==='en'?'Real estate':'عقارات'})[M.category(p.category)]||p.category||t('غير متاح')],['نوع الفرصة',p=>p.type||t('غير متاح')],['السعر المطلوب',p=>amount(p.price)],['صافي الربح الشهري المعلن',p=>amount(p.monthly_profit)],['عائد سنوي تقديري',p=>M.roi(p)===null?t('غير متاح'):M.roi(p)+'%'],['التوثيق',p=>t(M.verified(p)?'موثق':'غير موثق')]];
    box.innerHTML=`<div class="compare-scroll" tabindex="0" role="region" aria-label="${esc(t('قارن المشاريع'))}"><table class="comparison-table"><caption>${esc(t('قارن المشاريع'))}</caption><thead><tr><th scope="col">${document.documentElement.lang==='en'?'Business':'المشروع'}</th>${rows.map(p=>`<th scope="col"><a href="project-details.html?id=${encodeURIComponent(p.id)}">${esc(p.title)}</a></th>`).join('')}</tr></thead><tbody>${fields.map(([label,fn])=>`<tr><th scope="row">${esc(t(label))}</th>${rows.map(p=>`<td>${esc(fn(p))}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">${esc(t('تفاصيل المشروع'))}</th>${rows.map(p=>`<td><a class="btn btn-outline" href="project-details.html?id=${encodeURIComponent(p.id)}">${esc(t('تفاصيل المشروع'))}</a></td>`).join('')}</tr></tbody></table></div>`;
  }
  async function load(){const box=document.querySelector('[data-comparison-table]');if(!box||!window.supabaseClient)return;
    const raw=(new URL(location.href).searchParams.get('ids')||'').split(',');
    const wanted=[...new Set(raw.filter(x=>/^[\w-]{1,100}$/.test(x)))].slice(0,3);
    if(wanted.length<2){renderTable(box,[]);return;}
    box.innerHTML=`<div class="empty-state" role="status">${esc(t('جاري تحميل المقارنة...'))}</div>`;
    try{
      const {data,error}=await window.supabaseClient.from('marketplace_projects').select('*').in('id',wanted).in('status',['approved','active','published']);
      if(error)throw error;
      comparisonRows=wanted.map(id=>(data||[]).find(p=>String(p.id)===id)).filter(Boolean);renderTable(box,comparisonRows);
      if(comparisonRows.length<wanted.length){const note=document.createElement('p');note.textContent=t('بعض المشاريع لم تعد متاحة للنشر');box.prepend(note);}
    }catch(error){box.innerHTML=`<div class="empty-state" role="alert">${esc(t('تعذر تحميل المقارنة'))}<p><button class="btn btn-outline" data-compare-retry>${document.documentElement.lang==='en'?'Try again':'إعادة المحاولة'}</button></p></div>`;box.querySelector('button').onclick=load;console.warn(error);}
  }
  document.addEventListener('alo:language-applied',()=>{refresh();if(comparisonRows)renderTable(document.querySelector('[data-comparison-table]'),comparisonRows);});
  window.AloCompare={refresh,load};
})();
