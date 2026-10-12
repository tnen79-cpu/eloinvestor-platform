'use client';
import { useState } from 'react';
import { openVerificationDocument } from '@/lib/verification-client';
export function PrivateDocumentButton({url,lang='ar',className='text-blue-700 underline'}:{url:string;lang?:string;className?:string}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');async function open(){if(busy)return;setBusy(true);setError('');const tab=window.open('about:blank','_blank');if(tab)tab.opener=null;try{const signed=await openVerificationDocument(url);if(tab)tab.location.replace(signed);else window.location.assign(signed);}catch(e){tab?.close();setError((e as any)?.message||'تعذر فتح المستند');}finally{setBusy(false);}}
 return <span><button type="button" disabled={busy} onClick={open} className={className}>{busy?'...':lang==='ar'?'فتح المستند':'Open document'}</button>{error&&<span role="alert" className="block text-sm text-red-700">{error}</span>}</span>;
}
