import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json(data, { status });
}

function getMissingColumn(message: string) {
  const patterns = [
    /column ['"]?([^'"\s]+)['"]? of relation/i,
    /Could not find the ['"]([^'"]+)['"] column/i,
    /Could not find column ['"]([^'"]+)['"]/i,
    /schema cache[^.]*['"]([^'"]+)['"]/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

async function insertViewLog(db: any, projectId: string, viewerId: string | null, userAgent: string, ip: string) {
  const row: Record<string, unknown> = {
    project_id: projectId,
    viewer_id: viewerId,
    viewer_auth_id: viewerId,
    ip_address: ip || null,
    user_agent: userAgent || null,
    created_at: new Date().toISOString(),
  };

  for (let i = 0; i < 8; i += 1) {
    const { error } = await db.from('project_views_log').insert(row);
    if (!error) return;
    const message = [error.message, error.details, error.hint].filter(Boolean).join(' ');
    const missing = getMissingColumn(message);
    if (missing && Object.prototype.hasOwnProperty.call(row, missing)) {
      delete row[missing];
      continue;
    }
    console.warn('project_views_log skipped:', message);
    return;
  }
}

async function incrementProject(db: any, projectId: string) {
  const rpcNames = ['increment_project_view_count', 'increment_project_views', 'track_project_view'];
  const argShapes = [
    { p_project_id: projectId },
    { project_id_input: projectId },
    { project_id: projectId },
  ];

  for (const fn of rpcNames) {
    for (const args of argShapes) {
      const { error } = await db.rpc(fn, args);
      if (!error) return true;
    }
  }

  const { data, error } = await db.from('projects').select('*').eq('id', projectId).maybeSingle();
  if (error) return false;
  const currentViewsCount = Number((data as any)?.views_count || (data as any)?.views || 0) + 1;
  const currentViews = Number((data as any)?.views || (data as any)?.views_count || 0) + 1;

  const patches = [
    { views_count: currentViewsCount },
    { views: currentViews },
    { views_count: currentViewsCount, views: currentViews },
  ];
  for (const patch of patches) {
    const { error: updateError } = await db.from('projects').update(patch).eq('id', projectId);
    if (!updateError) return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    if (!supabaseUrl || !anonKey) return json({ ok: false, error: 'Supabase settings missing.' }, 500);
    const body = await req.json().catch(() => ({}));
    const projectId = String(body?.projectId || '').trim();
    if (!projectId) return json({ ok: false, error: 'projectId is required.' }, 400);

    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
    let viewerId: string | null = null;
    if (token) {
      const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data } = await authClient.auth.getUser(token);
      viewerId = data.user?.id || null;
    }

    const db = createClient(supabaseUrl, serviceRoleKey || anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: token && !serviceRoleKey ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    });

    await insertViewLog(db, projectId, viewerId, req.headers.get('user-agent') || '', req.headers.get('x-forwarded-for') || '');
    const counted = await incrementProject(db, projectId);
    return json({ ok: true, counted });
  } catch (err) {
    return json({ ok: false, error: err instanceof Error ? err.message : 'View tracking failed.' }, 500);
  }
}
