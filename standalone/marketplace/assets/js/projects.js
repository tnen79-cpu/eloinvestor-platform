// Projects + image upload + project verification
let selectedProjectImages=[]; let selectedCoverIndex=0;

function projectCard(p){
 const v=p.verification_status==="verified";
 return `<article class="project-card"><a href="project-details.html?id=${p.id}">
 <div class="project-img"><img src="${p.image_url||'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85'}" loading="lazy"><span class="badge">${p.type||'فرصة'}</span>${v?'<span class="verified-project-badge">✅ مشروع موثق</span>':''}</div>
 <div class="card-body"><h3>${p.title||''}</h3><div class="place">${p.location||''}</div><div class="project-meta"><div><div class="amount">${p.price||0}</div><div class="small-muted">المبلغ</div></div><div><div class="small-muted">الربح الشهري</div><b>${p.monthly_profit||0} ر.ع</b></div></div></div></a></article>`;
}

async function loadProjects(){
 if(!window.supabaseClient)return; const containers=document.querySelectorAll("[data-project-list]"); if(!containers.length)return;
 const category=typeof getCategoryFromUrl==="function"?getCategoryFromUrl():null;
 let q=window.supabaseClient.from("projects").select("*").eq("status","approved").order("created_at",{ascending:false});
 if(category)q=q.eq("category",category);
 const {data,error}=await q; if(error){console.error(error);return;}
 containers.forEach(c=>{const limit=Number(c.dataset.limit||(data||[]).length); c.innerHTML=(data||[]).slice(0,limit).map(projectCard).join("");});
}

async function getProjectById(id){
 const {data,error}=await window.supabaseClient.from(location.pathname.includes('admin')?'projects':'marketplace_projects').select("*").eq("id",id).single();
 if(error){console.error(error);return null;} return data;
}

function initProjectImageUploadUI(){
 const zone=document.querySelector("[data-upload-zone]"), input=document.querySelector("[data-project-image-input]"), empty=document.querySelector("[data-upload-empty]"), grid=document.querySelector("[data-preview-grid]");
 if(!zone||!input||!grid)return;
 let blobUrls=[];
 function render(){
  blobUrls.forEach(url=>URL.revokeObjectURL(url));blobUrls=[];
  grid.innerHTML="";
  if(!selectedProjectImages.length){selectedCoverIndex=0; empty.style.display="block"; return;}
  if(selectedCoverIndex>=selectedProjectImages.length)selectedCoverIndex=0;
  empty.style.display="none";
  selectedProjectImages.forEach((file,index)=>{
   const url=URL.createObjectURL(file), isCover=index===selectedCoverIndex;blobUrls.push(url);
   const item=document.createElement("div"); item.className="preview-item";
   item.innerHTML=`<img src="${url}"><button type="button" class="preview-remove">×</button>${isCover?'<div class="preview-cover">الغلاف</div>':'<button type="button" class="preview-set-cover">اجعلها الغلاف</button>'}`;
   item.querySelector(".preview-remove").onclick=e=>{e.stopPropagation(); selectedProjectImages.splice(index,1); if(selectedCoverIndex===index)selectedCoverIndex=0; else if(selectedCoverIndex>index)selectedCoverIndex--; render();};
   const cover=item.querySelector(".preview-set-cover"); if(cover)cover.onclick=e=>{e.stopPropagation(); selectedCoverIndex=index; render();};
   grid.appendChild(item);
  });
 }
 function handle(files){
  const imgs=Array.from(files).filter(f=>f.type.startsWith("image/"));
  if(!imgs.length)return;
  if(imgs.find(f=>f.size>5*1024*1024)){alert("يوجد صورة أكبر من 5MB");return;}
  if(selectedProjectImages.length+imgs.length>10){alert("الحد الأقصى 10 صور فقط");return;}
  selectedProjectImages.push(...imgs); render();
 }
 zone.onclick=e=>{if(e.target.closest(".preview-remove")||e.target.closest(".preview-set-cover"))return; input.click();};
 input.onchange=e=>{handle(e.target.files); input.value="";};
 zone.ondragover=e=>{e.preventDefault(); zone.classList.add("drag-over");};
 zone.ondragleave=()=>zone.classList.remove("drag-over");
 zone.ondrop=e=>{e.preventDefault(); zone.classList.remove("drag-over"); handle(e.dataTransfer.files);};
}

async function uploadToBucket(bucket,file,userId){return window.AloFlows.upload(file,bucket,userId);}
async function uploadMultipleProjectImages(files,userId){const urls=[]; for(const f of files){urls.push(await uploadToBucket("project-images",f,userId));} return urls;}
function getOrderedImagesWithCoverFirst(){if(!selectedProjectImages.length)return[]; const cover=selectedProjectImages[selectedCoverIndex]||selectedProjectImages[0]; return [cover,...selectedProjectImages.filter((_,i)=>i!==selectedCoverIndex)];}

async function submitProject(form){
 if(form.dataset.submitting==='1'||!form.reportValidity())return;
 const btn=form.querySelector("button[type=submit]"),old=btn?.textContent;form.dataset.submitting='1';
 try{
  const user=await getSessionUser();if(!user){location.href='login.html?next=add-project.html';return;}
  const value=n=>form.querySelector(`[name=${n}]`)?.value?.trim()||'';
  const details={title:value('title'),description:value('description'),category:value('category'),type:value('type'),price:Number(value('price')),monthly_profit:value('monthly_profit')===''?null:Number(value('monthly_profit')),location:value('location')};
  const files=getOrderedImagesWithCoverFirst(),docs=Array.from(form.querySelector('[name=project_verification_files]')?.files||[]);
  if(docs.length>10)throw new Error('الحد الأقصى 10 مستندات');
  files.forEach(f=>window.AloFlows.validate(f,'project-images'));docs.forEach(f=>window.AloFlows.validate(f,'verification-files'));
  // Fail before uploading if the transactional API is unavailable.
  const {data:ready,error:readyError}=await window.supabaseClient.rpc('transaction_flows_ready_v75');if(readyError||ready!==true)throw new Error('نشر المشاريع غير متاح حاليًا. تواصل مع إدارة المنصة.');
  const request=await window.AloFlows.requestKey(user.id+'_publish',details,[...files,...docs]);
  if(btn){btn.disabled=true;btn.textContent='جاري رفع الملفات...';}
  const images=[],documents=[];
  for(let i=0;i<files.length;i++)images.push(await window.AloFlows.upload(files[i],'project-images',user.id,request.id+'/image-'+i));
  for(let i=0;i<docs.length;i++)documents.push({file_url:await window.AloFlows.upload(docs[i],'verification-files',user.id,request.id+'/document-'+i),file_name:docs[i].name,file_type:docs[i].type});
  if(btn)btn.textContent='جاري إرسال المشروع...';
  const {data,error}=await window.supabaseClient.rpc('publish_project_v75',{request_key:request.id,details,images,documents});
  if(error||!data)throw error||new Error('تعذر إرسال المشروع');
  request.clear();form.reset();selectedProjectImages=[];selectedCoverIndex=0;
  const grid=document.querySelector('[data-preview-grid]'),empty=document.querySelector('[data-upload-empty]');if(grid)grid.innerHTML='';if(empty)empty.style.display='block';
  alert('تم إرسال المشروع للمراجعة وخصم رصيد واحد بنجاح.');location.href='user-dashboard.html';
 }catch(err){console.error(err);alert(err.message||'تعذر إرسال المشروع. يمكنك إعادة المحاولة دون تكرار الطلب.');}
 finally{form.dataset.submitting='0';if(btn){btn.disabled=false;btn.textContent=old;}}
}
