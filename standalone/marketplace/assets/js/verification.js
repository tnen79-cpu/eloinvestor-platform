// Account or explicitly owned project documents; previous revisions remain visible.
async function loadVerificationPage(){
 const form=document.querySelector('[data-verification-form]');if(!form||form.dataset.ready)return;
 const user=await getSessionUser();if(!user){location.href='login.html?next='+encodeURIComponent(location.pathname+location.search);return;}
 const esc=window.escapeHtml||((v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
 const project=new URLSearchParams(location.search).get('project'),history=document.querySelector('[data-verification-history]'),status=document.querySelector('[data-user-verification-status]'),select=form.querySelector('[name=replacement]');
 const states={not_verified:'غير موثق',pending:'قيد المراجعة',under_review:'قيد المراجعة',verified:'موثق',rejected:'مرفوض',needs_documents:'مطلوب مستندات',suspicious:'يحتاج تدقيق',expired:'منتهي'};
 async function refresh(){
  await window.AloReview.ensure();let target;
  if(project){const r=await window.supabaseClient.from('projects').select('id,title,verification_status').eq('id',project).eq('owner_auth_id',user.id).maybeSingle();if(r.error||!r.data)throw r.error||new Error('المشروع غير متاح لهذا الحساب');target=r.data;}else target=await getUserProfile();
  form.querySelector('[data-verification-target]').textContent=project?'توثيق المشروع: '+target.title:'توثيق حساب المستثمر';status.textContent=states[target.verification_status]||target.verification_status||'غير موثق';
  let query=window.supabaseClient.from('verification_files').select('id,file_name,file_url,status,admin_note,is_current,created_at').eq('owner_auth_id',user.id).eq('target_type',project?'project':'investor');query=project?query.eq('project_id',project):query.is('project_id',null);
  const r=await query.order('created_at',{ascending:false});if(r.error)throw r.error;const rows=r.data||[];
  select.innerHTML='<option value="">إضافة مستند جديد</option>'+rows.filter(d=>d.is_current).map(d=>`<option value="${esc(d.id)}">${esc(d.file_name)} — ${esc(states[d.status]||d.status)}</option>`).join('');
  history.innerHTML=rows.map(d=>`<article><b>${esc(d.file_name)}</b><p>${d.is_current?'مستند حالي':'نسخة سابقة تم استبدالها'} — ${esc(states[d.status]||d.status)}</p>${d.admin_note?`<p>ملاحظة المراجع: ${esc(d.admin_note)}</p>`:''}<a href="${esc(d.file_url)}" target="_blank" rel="noopener">فتح المستند</a></article>`).join('')||'<p>لم ترسل مستندات بعد.</p>';window.AloFlows?.hydratePrivateLinks?.();
 }
 try{await refresh();}catch(e){history.textContent=e.message||'تعذر تحميل المستندات';form.querySelector('[type=submit]').disabled=true;return;}
 form.dataset.ready='1';form.addEventListener('submit',async e=>{e.preventDefault();if(form.dataset.saving||!form.reportValidity())return;form.dataset.saving='1';const button=form.querySelector('[type=submit]');button.disabled=true;const old=button.textContent;button.textContent='جاري تقديم المستندات...';
  try{await window.AloReview.submitDocs(Array.from(form.querySelector('[type=file]').files),user.id,project,form.querySelector('[name=file_name]').value,select.value||null);form.reset();await refresh();alert('تم تقديم المستندات للمراجعة');}catch(err){alert(err.message||'تعذر تقديم المستندات');}finally{delete form.dataset.saving;button.disabled=false;button.textContent=old;}
 });
}
