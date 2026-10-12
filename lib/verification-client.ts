'use client';
import { supabaseBrowser } from '@/lib/supabase-browser';
const pending=new Map<string,string>();
export async function requireMarketplaceReady(){const r=await supabaseBrowser.rpc('next_marketplace_ready');if(r.error||r.data!==true)throw new Error('خدمات المراجعة غير مفعّلة بعد. تواصل مع الإدارة.');}
export async function submitVerificationDocument(file:File,kind:'project'|'investor',projectId:string|null,note:string,country:string,replacementId:string|null=null){
 if(!file.size||file.size>8*1024*1024||!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type))throw new Error('اختر PDF أو JPG أو PNG أو WebP حتى 8 MB.');
 await requireMarketplaceReady();const {data:auth,error}=await supabaseBrowser.auth.getUser();if(error||!auth.user)throw new Error('سجّل الدخول أولًا.');
 const bytes=await file.arrayBuffer(),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const fingerprint=JSON.stringify([auth.user.id,kind,projectId,note,country,replacementId,digest]);let key=pending.get(fingerprint);if(!key){try{key=sessionStorage.getItem('next-verification:'+fingerprint)||undefined;}catch{}key=key||crypto.randomUUID();pending.set(fingerprint,key);try{sessionStorage.setItem('next-verification:'+fingerprint,key);}catch{}}
 const path=`${auth.user.id}/${key}/${digest}.${file.type==='application/pdf'?'pdf':file.type==='image/jpeg'?'jpg':file.type==='image/png'?'png':'webp'}`;
 const upload=await supabaseBrowser.storage.from('verification-files').upload(path,file,{upsert:false,contentType:file.type});if(upload.error&&String(upload.error.statusCode)!=='409'&&!/already exists|duplicate/i.test(upload.error.message))throw upload.error;
 const {data:session}=await supabaseBrowser.auth.getSession();const response=await fetch('/api/trust/verification',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.session?.access_token||''}`},body:JSON.stringify({requestKey:key,requestType:kind,projectId,documentPath:path,documentType:file.type,note,country,replacementId})});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'تعذر إرسال المستند.');pending.delete(fingerprint);try{sessionStorage.removeItem('next-verification:'+fingerprint);}catch{}return result.verification;
}
export function documentLocator(raw:string){
 try{const u=new URL(raw);if(u.protocol==='storage:'&&['verification-files','verification-docs'].includes(u.hostname))return{bucket:u.hostname,path:decodeURIComponent(u.pathname.slice(1))};const base=new URL(process.env.NEXT_PUBLIC_SUPABASE_URL||'https://example.supabase.co');if(u.origin!==base.origin)return null;const m=u.pathname.match(/^\/storage\/v1\/object\/(?:public|sign)\/(verification-files|verification-docs)\/(.+)$/);return m?{bucket:m[1],path:decodeURIComponent(m[2])}:null;}catch{return null;}
}
export async function openVerificationDocument(raw:string){
 const ref=documentLocator(raw);if(!ref||ref.path.includes('..'))throw new Error('رابط المستند غير صالح.');await requireMarketplaceReady();const result=await supabaseBrowser.storage.from(ref.bucket).createSignedUrl(ref.path,300);if(result.error||!result.data?.signedUrl)throw result.error||new Error('تعذر فتح المستند.');return result.data.signedUrl;
}
export async function reviewVerificationRequest(id:string,revision:number,decision:string,reason:string){await requireMarketplaceReady();const r=await supabaseBrowser.rpc('next_review_verification',{request_id:id,expected_revision:revision,decision,reason});if(r.error||r.data==null)throw r.error||new Error('تعذر حفظ المراجعة.');return r.data as string;}
