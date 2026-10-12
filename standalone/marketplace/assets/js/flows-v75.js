(function(){
 const privateBuckets=new Set(['payment-receipts','verification-files','chat-attachments']);
 const rules={'project-images':{max:5*1024*1024,types:['image/jpeg','image/png','image/webp']},'verification-files':{max:8*1024*1024,types:['image/jpeg','image/png','image/webp','application/pdf']},'payment-receipts':{max:8*1024*1024,types:['image/jpeg','image/png','image/webp','application/pdf']},'chat-attachments':{max:10*1024*1024,types:['image/jpeg','image/png','image/webp','image/gif','application/pdf','text/plain','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']}};
 let protectedFiles=false,transactionsReady=false;const memoryKeys=new Map();
 function validate(file,bucket){const r=rules[bucket];if(!r||!file||!file.size||file.size>r.max||!r.types.includes(file.type))throw new Error('نوع الملف أو حجمه غير مسموح. اختر صورة JPG/PNG/WebP أو ملفًا مسموحًا بالحجم المحدد.');}
 async function secureFiles(){if(protectedFiles)return;const {data,error}=await window.supabaseClient.rpc('private_files_ready_v75');if(error||data!==true)throw new Error('رفع الملفات الخاصة غير متاح حاليًا. تواصل مع إدارة المنصة.');protectedFiles=true;}
 async function ensureTransactions(){if(transactionsReady)return;const {data,error}=await window.supabaseClient.rpc('transaction_flows_ready_v75');if(error||data!==true)throw new Error('هذه العملية غير متاحة حاليًا. تواصل مع إدارة المنصة.');transactionsReady=true;}
 function uuid(){if(crypto.randomUUID)return crypto.randomUUID();return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));}
 async function requestKey(scope,value,files=[]){
  const digests=[];for(const f of files){const bytes=await f.arrayBuffer();const hash=await crypto.subtle.digest('SHA-256',bytes);digests.push([...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join(''));}
  const sig=JSON.stringify([value,digests]);const key='alo_v75_request_'+scope;let old=memoryKeys.get(key);
  try{old=JSON.parse(sessionStorage.getItem(key)||'null')||old;}catch{}
  const next=old?.signature===sig?old:{signature:sig,id:uuid()};memoryKeys.set(key,next);
  try{sessionStorage.setItem(key,JSON.stringify(next));}catch{}
  return {id:next.id,clear(){memoryKeys.delete(key);try{sessionStorage.removeItem(key);}catch{}}};
 }
 async function upload(file,bucket,owner,path){
  validate(file,bucket);if(privateBuckets.has(bucket))await secureFiles();
  const ext=({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif','application/pdf':'pdf','text/plain':'txt','application/msword':'doc','application/vnd.openxmlformats-officedocument.wordprocessingml.document':'docx','application/vnd.ms-excel':'xls','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'xlsx'})[file.type];
  const name=owner+'/'+(path||uuid())+'.'+ext;
  const {error}=await window.supabaseClient.storage.from(bucket).upload(name,file,{upsert:false,contentType:file.type,cacheControl:'3600'});
  if(error&&String(error.statusCode||error.status)!=='409')throw error;
  return privateBuckets.has(bucket)?'storage://'+bucket+'/'+name:window.supabaseClient.storage.from(bucket).getPublicUrl(name).data.publicUrl;
 }
 function locator(raw){
  const value=String(raw||'');let bucket,path;
  if(value.startsWith('storage://')){const u=new URL(value);bucket=u.hostname;path=u.pathname.slice(1);}
  else{try{const u=new URL(value),base=new URL(window.SUPABASE_URL);if(u.origin!==base.origin)return null;const m=u.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);if(!m)return null;bucket=m[1];path=decodeURIComponent(m[2]);}catch{return null;}}
  return privateBuckets.has(bucket)&&path&&!path.includes('..')?{bucket,path}:null;
 }
 const signed=new Map();
 async function signedUrl(raw){const ref=locator(raw);if(!ref)return raw;await secureFiles();const key=ref.bucket+'/'+ref.path,c=signed.get(key);if(c&&c.until>Date.now())return c.url;const {data,error}=await window.supabaseClient.storage.from(ref.bucket).createSignedUrl(ref.path,300);if(error||!data?.signedUrl)throw error||new Error('تعذر فتح الملف');signed.set(key,{url:data.signedUrl,until:Date.now()+240000});return data.signedUrl;}
 function hydrate(){
  document.querySelectorAll('img[src],a[href]').forEach(el=>{const attr=el.tagName==='IMG'?'src':'href',raw=el.dataset.privateFile||el.getAttribute(attr);if(!locator(raw)||el.dataset.privateLoading)return;
   el.dataset.privateFile=raw;
   if(el.tagName!=='IMG')return;
   if(el.dataset.privateHydrated===raw)return;el.dataset.privateLoading='1';
   signedUrl(raw).then(url=>{el.setAttribute(attr,url);el.dataset.privateHydrated=raw;}).catch(()=>{el.removeAttribute('src');el.alt='تعذر عرض الملف الخاص';}).finally(()=>delete el.dataset.privateLoading);
  });
 }
 function init(){
  if(window.__privateFilesObserver)return;window.__privateFilesObserver=true;
  new MutationObserver(hydrate).observe(document.body,{childList:true,subtree:true});hydrate();
  document.addEventListener('click',async e=>{const a=e.target.closest('a[href]');if(!a)return;const raw=a.dataset.privateFile||a.getAttribute('href');if(!locator(raw))return;e.preventDefault();
   // Open during the click to avoid popup blocking after asynchronous signing.
   const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;
   try{const url=await signedUrl(raw);if(tab)tab.location.replace(url);else location.href=url;}catch(err){tab?.close();alert('تعذر فتح الملف. تحقق من صلاحية حسابك أو أعد المحاولة.');}
  },true);
 }
 window.AloFlows={validate,requestKey,upload,signedUrl,locator,secureFiles,ensureTransactions,init};
})();
