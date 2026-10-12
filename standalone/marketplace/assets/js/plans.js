// Packages are rendered from admin_plans; payment terms are assigned on the server.
let livePlans=[];
const paymentEsc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function loadLivePlans(){const box=document.querySelector('[data-plans]');if(!box||!window.supabaseClient)return;
 try{const {data,error}=await window.supabaseClient.from('admin_plans').select('code,name,price,duration_days,project_limit,featured_limit,features,payment_instructions').eq('is_active',true).order('sort_order');if(error)throw error;livePlans=data||[];
 box.innerHTML=livePlans.map(p=>`<article class="plan-card"><h2>${paymentEsc(p.name)}</h2><strong>${Number(p.price).toLocaleString('en-OM')} ر.ع</strong><p>${Number(p.duration_days)} يوم · ${Number(p.project_limit)} مشروع</p><ul>${(Array.isArray(p.features)?p.features:[]).map(f=>`<li>${paymentEsc(f)}</li>`).join('')}</ul>${Number(p.price)>0?`<button class="btn btn-green btn-block" data-buy-plan data-plan="${paymentEsc(p.code)}" ${p.payment_instructions?'':'disabled'}>${p.payment_instructions?'شراء الباقة':'الشراء غير متاح حاليًا'}</button>`:'<a class="btn btn-outline" href="register.html">ابدأ بحساب مجاني</a>'}</article>`).join('')||'<div class="empty-state">لا توجد باقات فعالة حاليًا.</div>';
 }catch(err){box.innerHTML='<div class="empty-state" role="alert">تعذر تحميل الباقات.<p><button class="btn btn-outline" data-retry-plans>إعادة المحاولة</button></p></div>';box.querySelector('button').onclick=loadLivePlans;}
}
function openPaymentModal(dataset){const p=livePlans.find(p=>p.code===dataset.plan);if(!p||!p.payment_instructions)return;
 const modal=document.querySelector('#paymentModal'),form=document.querySelector('#paymentRequestForm');if(!modal||!form)return;
 form._quotedTerms={price:Number(p.price),credits:Number(p.project_limit),featured:Number(p.featured_limit||0),days:Number(p.duration_days),instructions:p.payment_instructions};
 form.querySelector('[name=plan]').value=p.code;document.querySelector('#paymentPlanTitle').textContent=`${p.name} — ${Number(p.price).toLocaleString('en-OM')} ر.ع`;
 document.querySelector('[data-bank-instructions]').textContent=p.payment_instructions;modal.hidden=false;modal.classList.add('open');form.querySelector('[name=reference]').focus();
}
function closePaymentModal(){const modal=document.querySelector('#paymentModal');if(!modal)return;modal.classList.remove('open');modal.hidden=true;}
async function submitPaymentRequest(e){e.preventDefault();const form=e.target;if(form.dataset.submitting==='1'||!form.reportValidity())return;
 const btn=form.querySelector('button[type=submit]'),old=btn?.textContent;form.dataset.submitting='1';if(btn)btn.disabled=true;
 try{const user=await getSessionUser();if(!user){location.href='login.html?next=plans.html';return;}
  const field=n=>form.querySelector(`[name=${n}]`);const plan=field('plan').value,reference=field('reference').value.trim(),note=field('note')?.value.trim()||'',file=field('receipt').files[0];
  await window.AloFlows.ensureTransactions();window.AloFlows.validate(file,'payment-receipts');if(reference.length<3)throw new Error('أدخل مرجع التحويل الصحيح');
  const req=await window.AloFlows.requestKey(user.id+'_payment',{plan,reference,note,quote:form._quotedTerms},[file]);if(btn)btn.textContent='جاري رفع الإيصال...';
  const receipt=await window.AloFlows.upload(file,'payment-receipts',user.id,req.id+'/receipt');
  if(btn)btn.textContent='جاري إنشاء الطلب...';const {data,error}=await window.supabaseClient.rpc('request_payment_v75',{request_key:req.id,plan_code:plan,reference_text:reference,receipt,note_text:note,quoted_terms:form._quotedTerms});if(error||!data)throw error||new Error('تعذر إنشاء الطلب');
  req.clear();closePaymentModal();alert('تم إرسال طلب الدفع للمراجعة.');location.href='payments.html';
 }catch(err){console.error(err);alert(err.message||'تعذر إرسال الطلب. أعد المحاولة.');}finally{form.dataset.submitting='0';if(btn){btn.disabled=false;btn.textContent=old;}}
}
async function loadPaymentHistory(){const box=document.querySelector('[data-payment-history]');if(!box)return;
 try{const user=await getSessionUser();if(!user){location.href='login.html?next=payments.html';return;}const {data,error}=await window.supabaseClient.from('payment_requests').select('id,plan,amount_omr,credits,days,status,payment_reference,receipt_url,admin_note,created_at').eq('user_auth_id',user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;
 box.innerHTML=(data||[]).map(r=>`<article class="workspace-card"><h2>${paymentEsc(r.plan)} — ${Number(r.amount_omr).toLocaleString('en-OM')} ر.ع</h2><strong>${({pending:'قيد المراجعة',approved:'تم التفعيل',rejected:'مرفوض'})[r.status]||'قيد المراجعة'}</strong><p>مرجع التحويل: ${paymentEsc(r.payment_reference)} · ${Number(r.credits)} مشروع · ${Number(r.days)} يوم</p>${r.admin_note?`<p>ملاحظة الإدارة: ${paymentEsc(r.admin_note)}</p>`:''}${r.receipt_url?`<a class="btn btn-outline" href="${paymentEsc(r.receipt_url)}" target="_blank" rel="noopener">فتح الإيصال</a>`:''}</article>`).join('')||'<div class="empty-state">لا توجد طلبات دفع بعد.</div>';
 }catch(err){box.innerHTML='<div class="empty-state" role="alert">تعذر تحميل الطلبات.<p><button class="btn btn-outline">إعادة المحاولة</button></p></div>';box.querySelector('button').onclick=loadPaymentHistory;}
}
window.loadLivePlans=loadLivePlans;window.loadPaymentHistory=loadPaymentHistory;
document.addEventListener('click',e=>{const b=e.target.closest('[data-buy-plan]');if(b){e.preventDefault();openPaymentModal(b.dataset);}if(e.target.closest('[data-payment-close]')){e.preventDefault();closePaymentModal();}});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closePaymentModal();});
document.addEventListener('submit',e=>{if(e.target.id==='paymentRequestForm')submitPaymentRequest(e);});
