import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUser, jsonError } from '../_shared';
export const dynamic='force-dynamic';
export async function POST(req:NextRequest){try{
 const {token}=await getUser(req);const body=await req.json();
 if(!/^[0-9a-f-]{36}$/i.test(body.requestKey||'')||!['project','investor'].includes(body.requestType)||typeof body.documentPath!=='string'||typeof body.note!=='string'||body.note.length>2000)return jsonError('طلب التوثيق غير صالح.',400);
 const db=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:{Authorization:`Bearer ${token}`}}});
 const r=await db.rpc('next_submit_verification',{request_key:body.requestKey,request_kind:body.requestType,project_key:body.projectId||null,document_path:body.documentPath,document_mime:body.documentType,note_text:body.note,country:body.country,replacement_key:body.replacementId||null});if(r.error||!r.data)return jsonError(r.error?.message||'تعذر تقديم التوثيق.',409);return NextResponse.json({ok:true,verification:{id:r.data}});
}catch(e){return jsonError((e as any)?.message||'تعذر إرسال طلب التوثيق.',(e as any)?.status||500);}}
