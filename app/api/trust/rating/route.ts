import { NextRequest, NextResponse } from 'next/server';
import { getUser, insertWithFallback, jsonError } from '../_shared';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { user, db } = await getUser(req);
    const body = await req.json();
    const projectId = body.projectId || body.project_id;
    if (!projectId) return jsonError('رقم المشروع مطلوب.', 400);

    const { data: contacted } = await db.from('investor_contacted_projects').select('id').eq('investor_auth_id', user.id).eq('project_id', projectId).maybeSingle();
    if (!contacted) return jsonError('التقييم متاح فقط لمن تواصل فعليًا مع المشروع.', 403);

    const rating = Math.max(1, Math.min(5, Number(body.rating || 5)));
    const row = {
      reviewer_auth_id: user.id,
      reviewed_auth_id: body.reviewedUserId || body.reviewed_auth_id || null,
      project_id: projectId,
      rating,
      comment: String(body.comment || '').trim(),
      status: 'pending',
      created_at: new Date().toISOString(),
    };
    const result = await insertWithFallback(db, 'deal_ratings', row, { status: 'pending', rating });
    return NextResponse.json({ ok: true, rating: result.data, removed_columns: result.removed });
  } catch (error: any) {
    return jsonError(error?.message || 'تعذر إرسال التقييم.', error?.status || 500);
  }
}
