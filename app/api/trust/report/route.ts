import { NextRequest, NextResponse } from 'next/server';
import { getUser, insertWithFallback, jsonError } from '../_shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, db } = await getUser(req);
    const body = await req.json();
    const row = {
      reporter_auth_id: user.id,
      target_type: body.targetType || body.target_type || 'project',
      target_id: body.targetId || body.target_id || body.projectId || body.project_id || '',
      project_id: body.projectId || body.project_id || null,
      reported_user_auth_id: body.reportedUserId || body.reported_user_auth_id || null,
      reason: body.reason || 'other',
      description: String(body.description || '').trim(),
      status: 'open',
      created_at: new Date().toISOString(),
    };
    const result = await insertWithFallback(db, 'reports', row, { status: 'open', reason: 'other' });
    return NextResponse.json({ ok: true, report: result.data, removed_columns: result.removed });
  } catch (error: any) {
    return jsonError(error?.message || 'تعذر إرسال البلاغ.', error?.status || 500);
  }
}
