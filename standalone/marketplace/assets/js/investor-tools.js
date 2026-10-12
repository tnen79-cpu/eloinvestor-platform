(function(){
 const C=window.AloInvestorCore,M=window.AloMarket;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const t=(ar,en)=>document.documentElement.lang==='en'?en:ar;
 const checkNames={ownership:['الملكية والسجل التجاري','Ownership & registration'],license:['التراخيص السارية','Valid licenses'],financials:['الإيرادات والأرباح بمستندات','Documented revenue & profit'],debts:['الديون والالتزامات','Debts & obligations'],lease:['عقد الإيجار وإمكانية نقله','Lease & transferability'],staff:['الموظفون والتزاماتهم','Staff & obligations'],assets:['الأصول والمخزون','Assets & inventory'],terms:['شروط الصفقة والمتفق عليه','Deal terms']};
 const stageNames={shortlist:['قائمة مختصرة','Shortlist'],review:['مراجعة المستندات','Due diligence'],contact:['قيد التواصل','In discussion'],offer:['عرض قيد الدراسة','Offer review'],paused:['متوقف مؤقتًا','Paused']};
 function message(el,text,error=false){el.textContent=text;el.setAttribute('role',error?'alert':'status');}
 let securityChecked=false;
 async function ensureSecurity(){
  if(securityChecked)return;
  const r=await window.supabaseClient.rpc('marketplace_security_ready');
  if(r.error||r.data!==true)throw new Error(t('الحفظ الخاص غير متاح حاليًا. تواصل مع إدارة المنصة.','Private saving is currently unavailable. Contact the platform administrator.'));
  securityChecked=true;
 }
 async function user(){const u=await window.getSessionUser?.();if(!u)throw new Error(t('سجّل الدخول للمتابعة','Sign in to continue'));await ensureSecurity();return u;}
 function result(r){if(r.error)throw r.error;if(!r.data)throw new Error(t('لم يتم الحفظ. ربما تغيرت البيانات؛ أعد تحميل الصفحة.','Not saved. Data may have changed; reload and try again.'));return r.data;}
 function guardQuery(q,column,value){return value==null?q.is(column,null):q.eq(column,JSON.stringify(value));}
 async function preferences(){const u=await user();const r=await window.supabaseClient.from('users').select('investor_preferences').eq('auth_id',u.id).maybeSingle();const row=result(r);return {u,value:row.investor_preferences,preferences:row.investor_preferences||{}};}
 async function mutatePreferences(transform){
  const p=await preferences(),next=transform({...p.preferences});
  let q=window.supabaseClient.from('users').update({investor_preferences:next}).eq('auth_id',p.u.id);
  q=guardQuery(q,'investor_preferences',p.value);
  result(await q.select('investor_preferences').maybeSingle());return next;
 }
 async function updatePreferences(fields){return mutatePreferences(p=>({...p,...fields}));}
 async function saveProject(p){
  const u=await user();if(!p?.id)throw new Error('Missing project');
  const snapshot={id:p.id,title:p.title,category:p.category,location:p.location,price:p.price,image_url:p.image_url};
  const {error}=await window.supabaseClient.from('investor_saved_projects').upsert({investor_auth_id:u.id,project_id:p.id,project_snapshot:snapshot},{onConflict:'investor_auth_id,project_id',ignoreDuplicates:true});
  if(error)throw error; // Re-saving never overwrites private review notes.
 }
 let publicRows=[],savedSearches=[];
 function searchLink(s){const u=new URL('opportunities.html',location.href);Object.entries(s.filters).forEach(([k,v])=>{if(v)u.searchParams.set(k,v);});u.searchParams.set('lang',document.documentElement.lang||'ar');return u.pathname+u.search;}
 function renderSearches(box){
  const list=box.querySelector('[data-search-list]');if(!list)return;
  list.innerHTML=savedSearches.length?savedSearches.map(s=>{
   const matches=publicRows.filter(p=>M.matches(p,s.filters));
   const fresh=matches.filter(p=>Date.parse(p.created_at)>Date.parse(s.saved_at||0)).length;
   return `<article class="saved-search-row"><a href="${esc(searchLink(s))}"><b>${esc(s.name)}</b><small>${matches.length} ${t('فرصة مطابقة','matching listings')}${fresh?' · '+fresh+' '+t('جديدة منذ الحفظ','new since saved'):''}</small></a><button type="button" class="btn btn-outline" data-delete-search="${esc(s.id)}">${t('حذف','Delete')}</button></article>`;
  }).join(''):`<p class="muted">${t('لا توجد أبحاث محفوظة بعد. طبّق الفلاتر ثم احفظ البحث.','No saved searches. Apply your filters, then save the search.')}</p>`;
 }
 async function initSearches(){
  const box=document.querySelector('[data-investor-searches]');if(!box)return;
  const status=box.querySelector('[data-search-status]'),form=box.querySelector('form');
  if(box.dataset.ready)return;box.dataset.ready='1';
  try{const p=await preferences();savedSearches=C.searches(p.preferences.marketplace_searches);renderSearches(box);}catch(e){message(status,e.message||t('تعذر تحميل الأبحاث المحفوظة','Could not load saved searches'),true);}
  form.addEventListener('submit',async e=>{e.preventDefault();if(!form.reportValidity())return;const btn=form.querySelector('button');btn.disabled=true;
   try{
    const name=form.querySelector('input').value.trim();if(!name)throw new Error(t('أدخل اسم البحث','Enter a search name'));
    const filters=M.filters(new URL(location.href).searchParams);
    const next=await mutatePreferences(p=>{const list=C.searches(p.marketplace_searches);if(list.length>=5)throw new Error(t('يمكن حفظ 5 أبحاث. احذف بحثًا لإضافة جديد.','You can save 5 searches. Delete one to add another.'));return {...p,marketplace_searches:[{id:Date.now().toString(36)+Math.random().toString(36).slice(2,8),name,filters,saved_at:new Date().toISOString()},...list]};});
    savedSearches=C.searches(next.marketplace_searches);renderSearches(box);form.reset();message(status,t('تم حفظ البحث في حسابك','Search saved to your account'));
   }catch(e){message(status,e.message||t('تعذر الحفظ','Could not save'),true);}finally{btn.disabled=false;}
  });
  box.addEventListener('click',async e=>{const b=e.target.closest('[data-delete-search]');if(!b)return;b.disabled=true;
   try{const next=await mutatePreferences(p=>({...p,marketplace_searches:C.searches(p.marketplace_searches).filter(s=>s.id!==b.dataset.deleteSearch)}));savedSearches=C.searches(next.marketplace_searches);renderSearches(box);message(status,t('تم حذف البحث','Search deleted'));}catch(err){message(status,err.message||t('تعذر الحذف','Could not delete'),true);b.disabled=false;}
  });
 }
 async function loadWorkspace(){
  const box=document.querySelector('[data-investor-workspace]');if(!box)return;
  box.innerHTML=`<div class="empty-state" role="status">${t('جاري تحميل مساحة المتابعة...','Loading your workspace...')}</div>`;
  try{
   const u=await user();let saved=[],offset=0;
   while(true){const {data,error}=await window.supabaseClient.from('investor_saved_projects').select('*').eq('investor_auth_id',u.id).order('created_at',{ascending:false}).range(offset,offset+199);if(error)throw error;saved.push(...(data||[]));if((data||[]).length<200)break;offset+=200;}
   if(!saved.length){box.innerHTML=`<div class="empty-state">${t('احفظ مشروعًا من الفرص لبدء المتابعة.','Save a listing to start tracking it.')}<p><a href="opportunities.html" class="btn btn-green">${t('تصفح الفرص','Browse opportunities')}</a></p></div>`;return;}
   let projects=[];const ids=[...new Set(saved.map(s=>s.project_id))];
   for(let i=0;i<ids.length;i+=100){const {data,error}=await window.supabaseClient.from('projects').select('id,title,price,location,verification_status').in('id',ids.slice(i,i+100)).in('status',['approved','active','published']);if(error)throw error;projects.push(...(data||[]));}
   box.innerHTML=saved.map(s=>{
    const p=projects.find(p=>p.id===s.project_id),r=C.review(s.project_snapshot?.review);
    return `<article class="workspace-card" data-workspace-id="${esc(s.id)}"><header><div><h2>${esc(p?.title||t('مشروع لم يعد متاحًا','Listing no longer available'))}</h2><p>${p?esc(p.location||'')+' · '+Number(p.price||0).toLocaleString('en-OM')+' OMR':t('المتابعة محفوظة، لكن الإعلان ليس منشورًا حاليًا.','Your review is saved, but the listing is not currently public.')}</p></div>${p?`<a class="btn btn-outline" href="project-details.html?id=${encodeURIComponent(p.id)}">${t('التفاصيل','Details')}</a>`:''}</header><form><label>${t('مرحلة المتابعة','Review stage')}<select name="stage">${C.stages.map(k=>`<option value="${k}" ${r.stage===k?'selected':''}>${t(...stageNames[k])}</option>`).join('')}</select></label><fieldset><legend>${t('قائمة مراجعتك','Your due diligence checklist')} · ${r.checked.length}/8</legend>${C.checks.map(k=>`<label class="review-check"><input name="checked" type="checkbox" value="${k}" ${r.checked.includes(k)?'checked':''}>${t(...checkNames[k])}</label>`).join('')}</fieldset><label>${t('ملاحظات خاصة','Private notes')}<textarea name="notes" maxlength="2000" rows="3">${esc(r.notes)}</textarea></label><button class="btn btn-green" type="submit">${t('حفظ المتابعة','Save review')}</button><p data-review-status aria-live="polite"></p></form></article>`;
   }).join('');
   box.querySelectorAll('[data-workspace-id]').forEach(card=>{
    const row=saved.find(s=>s.id===card.dataset.workspaceId),form=card.querySelector('form');
    form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button'),status=form.querySelector('[data-review-status]');b.disabled=true;
     try{
      const review=C.review({stage:form.querySelector('select').value,checked:Array.from(form.querySelectorAll('input:checked')).map(i=>i.value),notes:form.querySelector('textarea').value});
      const snapshot={...(row.project_snapshot||{}),review:{...review,updated_at:new Date().toISOString()}};
      let q=window.supabaseClient.from('investor_saved_projects').update({project_snapshot:snapshot}).eq('id',row.id).eq('investor_auth_id',u.id);
      q=guardQuery(q,'project_snapshot',row.project_snapshot);
      result(await q.select('id').maybeSingle());row.project_snapshot=snapshot;form.querySelector('legend').textContent=t('قائمة مراجعتك','Your due diligence checklist')+' · '+review.checked.length+'/8';message(status,t('تم حفظ المتابعة في حسابك','Review saved to your account'));
     }catch(err){message(status,err.message||t('تعذر الحفظ','Could not save'),true);}finally{b.disabled=false;}
    });
   });
  }catch(err){box.innerHTML=`<div class="empty-state" role="alert"><p>${esc(err.message||t('تعذر تحميل المتابعة','Could not load workspace'))}</p><a class="btn btn-outline" href="login.html?next=workspace.html">${t('تسجيل الدخول','Sign in')}</a> <button class="btn btn-green" data-workspace-retry>${t('إعادة المحاولة','Try again')}</button></div>`;box.querySelector('button').onclick=loadWorkspace;}
 }
 function calculator(project){
  const box=document.querySelector('[data-investor-calculator]');if(!box)return;
  box.innerHTML=`<h2>${t('حلّل قبل أن تستثمر','Analyze before investing')}</h2><p>${t('غيّر الافتراضات لترى أثرها. هذه محاكاة وليست تقييمًا معتمدًا للمشروع.','Adjust assumptions to see the impact. This is a simulation, not a certified business valuation.')}</p><form class="scenario-inputs"><label>${t('سعر الشراء المفترض (ر.ع)','Assumed price (OMR)')}<input name="price" type="number" min="0.01" step="any" required value="${esc(project.price||'')}"></label><label>${t('صافي الربح الشهري المفترض','Assumed monthly net profit')}<input name="profit" type="number" step="any" required value="${esc(project.monthly_profit??'')}"></label><label>${t('تكاليف إضافية عند الشراء','Additional purchase costs')}<input name="costs" type="number" min="0" step="any" required value="0"></label></form><div data-scenarios aria-live="polite"></div><a class="btn btn-outline" href="workspace.html">${t('افتح مساحة متابعة المشاريع','Open your review workspace')}</a>`;
  const form=box.querySelector('form'),out=box.querySelector('[data-scenarios]');
  const render=()=>{if(!form.checkValidity()){message(out,t('أدخل سعرًا موجبًا، وربحًا شهريًا، وتكاليف غير سالبة.','Enter a positive price, monthly profit and non-negative costs.'),true);return;}
   const get=n=>form.querySelector(`[name=${n}]`).value;
   out.innerHTML=`<div class="scenario-grid">${[-20,0,20].map(d=>{const s=C.scenario(get('price'),get('profit'),get('costs'),d);return `<article><small>${t('تغير الربح','Profit change')} ${d>0?'+':''}${d}%</small><b>${s.roi.toFixed(1)}%</b><span>${t('عائد سنوي على كامل التكلفة','Annual return on total cost')}</span><strong>${s.paybackMonths===null?t('لا استرداد من الربح الحالي','No payback from current profit'):s.paybackMonths.toFixed(1)+' '+t('شهر للاسترداد','months to pay back')}</strong></article>`;}).join('')}</div>`;};
  form.addEventListener('input',render);form.addEventListener('submit',e=>e.preventDefault());render();
 }
 document.addEventListener('alo:market-loaded',e=>{publicRows=e.detail.rows;const b=document.querySelector('[data-investor-searches]');if(b)renderSearches(b);});
 window.AloInvestor={init:async()=>{await Promise.all([initSearches(),loadWorkspace()]);},saveProject,preferences,updatePreferences,calculator,loadWorkspace};
})();
