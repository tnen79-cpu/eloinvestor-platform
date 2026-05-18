import { NextRequest, NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

const COOKIE_NAME = 'elo_admin_session';
const DAY = 60 * 60 * 24;

function getSecret() {
  return process.env.ADMIN_PANEL_PASSWORD || process.env.ADMIN_ACCESS_PASSWORD || '';
}

function sign(value: string) {
  const secret = getSecret();
  if (!secret) return '';
  return createHmac('sha256', secret).update(value).digest('hex');
}

function validCookie(raw: string | undefined) {
  const secret = getSecret();
  if (!secret || !raw) return false;
  const [value, sig] = raw.split('.');
  if (!value || !sig) return false;
  const expected = sign(value);
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ ok: true, authenticated: validCookie(request.cookies.get(COOKIE_NAME)?.value) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const password = String(body?.password || '');
  const secret = getSecret();
  if (!secret) return NextResponse.json({ ok: false, error: 'ADMIN_PANEL_PASSWORD_MISSING' }, { status: 500 });
  if (password !== secret) return NextResponse.json({ ok: false, error: 'كلمة مرور الإدارة غير صحيحة' }, { status: 401 });

  const value = `admin-${Date.now()}`;
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: DAY * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, '', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 0 });
  return response;
}
