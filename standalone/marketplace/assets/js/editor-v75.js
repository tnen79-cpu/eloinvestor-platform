(function(){
 const keys=['title','description','category','type','price','monthly_profit','location'];
 async function init(){
  const form=document.querySelector('[data-owner-edit-form],[data-admin-edit-form]');if(!form||form.dataset.editorReady)return;form.dataset.editorReady='1';
  const admin=form.hasAttribute('data-admin-edit-form'),id=new URLSearchParams(location.search).get('id'),status=document.createElement('p');status.setAttribute('aria-live','polite');form.prepend(status);form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=true);
  try{if(!id)throw new Error('اختر مشروعًا من لوحة التحكم أولًا.');const user=await getSessionUser();if(!user){location.href='login.html?next='+encodeURIComponent(location.pathname+location.search);return;}
   if(admin){const r=await window.supabaseClient.rpc('is_admin_staff',{required_permission:'projects'});if(r.error||r.data!==true)throw new Error('لا تملك صلاحية تعديل المشاريع.');}
   let q=window.supabaseClient.from('projects').select('*').eq('id',id);if(!admin)q=q.eq('owner_auth_id',user.id);const {data,error}=await q.maybeSingle();if(error||!data)throw error||new Error('المشروع غير متاح لهذا الحساب.');
   let reviewRevision=Number(data.review_revision||0);
   let original=Object.fromEntries(keys.map(k=>[k,['price','monthly_profit'].includes(k)?(data[k]==null?null:Number(data[k])):data[k]]));
   form.querySelectorAll('[name]').forEach(el=>{if(data[el.name]!=null)el.value=data[el.name];});
   const note=document.querySelector('[data-owner-admin-note]');if(note){note.removeAttribute('data-i18n');note.textContent=data.admin_note||'لا توجد ملاحظات.';}
   form.querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=false);status.textContent='';
   form.querySelector('[name=price]').min='0.01';form.querySelector('[name=price]').step='any';form.querySelector('[name=monthly_profit]').step='any';form.querySelector('[name=title]').minLength=5;form.querySelector('[name=description]').minLength=80;
   form.addEventListener('submit',async e=>{e.preventDefault();if(form.dataset.saving==='1'||!form.reportValidity())return;const b=form.querySelector('button[type=submit]'),old=b.textContent;form.dataset.saving='1';b.disabled=true;
    try{const val=k=>form.querySelector(`[name=${k}]`).value.trim();const details=Object.fromEntries(keys.map(k=>[k,['price','monthly_profit'].includes(k)?(val(k)===''?null:Number(val(k))):val(k)]));
     if(admin){await window.AloReview.reviewProject(id,val('status'),val('admin_note'),reviewRevision,details);reviewRevision++;}
     else{await window.AloFlows.ensureTransactions();const r=await window.supabaseClient.rpc('owner_edit_project_v75',{project_key:id,details,expected_details:original});if(r.error||!r.data)throw r.error||new Error('تعذر حفظ المشروع');}
     original=details;status.setAttribute('role','status');status.textContent=admin?'تم حفظ التعديلات.':'تم حفظ التعديل وإعادة المشروع للمراجعة دون خصم رصيد جديد.';
    }catch(err){status.setAttribute('role','alert');status.textContent=err.message||'تعذر الحفظ. أعد المحاولة.';}finally{form.dataset.saving='0';b.disabled=false;b.textContent=old;}
   });
  }catch(err){status.setAttribute('role','alert');status.textContent=err.message||'تعذر تحميل المشروع. أعد تحميل الصفحة.';}
 }
 window.AloEditor={init};
})();

{const link=document.querySelector('[data-project-verification-link]');const id=new URLSearchParams(location.search).get('id');if(link&&id)link.href='verification.html?project='+encodeURIComponent(id);}
