(function(){
 function init(){
  const form=document.querySelector('[data-add-project-form]');if(!form||form.dataset.guideReady)return;form.dataset.guideReady='1';
  const t=(ar,en)=>document.documentElement.lang==='en'?en:ar;
  const description=form.querySelector('[name=description]');
  const guide=document.createElement('section');guide.className='owner-guide';
  const fields=[['reason','سبب البيع أو طلب الشراكة','Reason for selling or seeking a partner'],['age','مدة تشغيل المشروع','Operating history'],['revenue','الإيرادات الشهرية والفترة المرجعية','Monthly revenue and reference period'],['included','الأصول والمخزون المشمولة','Included assets and inventory'],['obligations','الديون والإيجار والالتزامات','Debts, rent and obligations'],['handover','طريقة التسليم ودعم الانتقال','Handover and transition support']];
  guide.innerHTML=`<h3>${t('جهّز عرضًا أوضح للمستثمر','Build a clearer investor listing')}</h3><p>${t('هذه التفاصيل تضاف إلى وصف المشروع فقط. لا تمنح توثيقًا ولا تفترض أن الأرقام مؤكدة.','These details are added to the listing description only. They do not grant verification or certify figures.')}</p><div class="owner-guide-fields">${fields.map(([k,a,e])=>`<label>${t(a,e)}<textarea rows="2" maxlength="800" data-guide-field="${k}"></textarea></label>`).join('')}</div><button type="button" class="btn btn-outline" data-build-description>${t('أضف التفاصيل إلى الوصف','Add details to description')}</button><p data-owner-progress aria-live="polite"></p>`;
  description.closest('.group').insertAdjacentElement('afterend',guide);
  const price=form.querySelector('[name=price]'),profit=form.querySelector('[name=monthly_profit]');price.min='0.01';price.step='any';profit.step='any';
  form.querySelector('[name=title]').minLength=5;description.minLength=80;
  function refresh(){
   const val=n=>form.querySelector(`[name=${n}]`)?.value?.trim()||'';
   const checks=[!!val('title'),!!val('category'),!!val('location'),Number(val('price'))>0,val('description').length>=80,(typeof getOrderedImagesWithCoverFirst==='function'?getOrderedImagesWithCoverFirst():[]).length>0];
   guide.querySelector('[data-owner-progress]').textContent=checks.filter(Boolean).length+'/6 · '+t('اكتمال العرض: عنوان، مجال، موقع، سعر، وصف مفصل وصور. هذا ليس تقييمًا للمشروع.','Listing completeness: title, sector, location, price, detailed description and photos. This is not a business valuation.');
  }
  guide.querySelector('button').onclick=()=>{
   const start='\n\n—— '+t('تفاصيل إضافية للمشروع','Additional business details')+' ——\n';
   const parts=fields.map(([k,a,e])=>{const v=guide.querySelector(`[data-guide-field=${k}]`).value.trim();return v?t(a,e)+': '+v:'';}).filter(Boolean);
   if(!parts.length)return;
   // Replace only a section produced by this helper; preserve the seller's original description.
   const existing=description.value.split(/\n\n—— (?:تفاصيل إضافية للمشروع|Additional business details) ——\n/)[0];
   description.value=existing+start+parts.join('\n');description.dispatchEvent(new Event('input',{bubbles:true}));refresh();
  };
  form.addEventListener('input',refresh);form.addEventListener('change',refresh);form.addEventListener('click',()=>setTimeout(refresh,0));form.addEventListener('reset',()=>setTimeout(refresh,0));refresh();
 }
 window.AloOwnerGuide={init};
})();
