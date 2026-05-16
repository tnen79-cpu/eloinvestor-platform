import { NextRequest, NextResponse } from 'next/server';
import { getUser, insertWithFallback, jsonError } from '../_shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, db } = await getUser(req);
    const body = await req.json();
    const requestType = body.requestType || body.request_type || body.type || 'investor';
    const row = {
      user_auth_id: user.id,
      request_type: requestType,
      type: requestType,
      project_id: requestType === 'project' ? (body.projectId || body.project_id || null) : null,
      project_title: body.projectTitle || body.project_title || '',
      status: 'pending',
      document_url: body.documentUrl || body.document_url || body.file_url || '',
      document_type: body.documentType || body.document_type || '',
      note: body.note || '',
      notes: body.note || body.notes || '',
      country_code: String(body.country || body.country_code || 'om').toLowerCase(),
      created_at: new Date().toISOString(),
    };
    const result = await insertWithFallback(db, 'verification_requests', row, { status: 'pending', request_type: requestType, type: requestType });
    return NextResponse.json({ ok: true, verification: result.data, removed_columns: result.removed });
  } catch (error: any) {
    return jsonError(error?.message || 'تعذر إرسال طلب التوثيق.', error?.status || 500);
  }
}
