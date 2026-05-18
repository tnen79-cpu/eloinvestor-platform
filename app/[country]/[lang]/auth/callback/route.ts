import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function isProfileComplete(profile: any) {
  const name = String(profile?.name || profile?.full_name || '').trim();
  const email = String(profile?.email || '').trim();
  const phone = String(profile?.phone || '').trim();
  const accountType = String(profile?.account_type || '').trim();
  if (!accountType) return false;
  if (!name) return false;
  if (name === email || name === phone) return false;
  return true;
}

export async function GET(request: NextRequest, context: { params: Promise<{ country: string; lang: string }> }) {
  const { country, lang } = await context.params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || `/${country}/${lang}/dashboard`;

  let response = NextResponse.redirect(new URL(next, request.url));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  if (!code) {
    return NextResponse.redirect(new URL(`/${country}/${lang}/login?error=missing_code`, request.url));
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/${country}/${lang}/login?error=${encodeURIComponent(error.message)}`, request.url));
  }

  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.redirect(new URL(`/${country}/${lang}/login?error=no_user`, request.url));
  }

  const { data: profile } = await supabase
    .from('users')
    .select('auth_id,name,full_name,email,phone,account_type,role')
    .eq('auth_id', user.id)
    .maybeSingle();

  if (!profile) {
    const meta = user.user_metadata || {};
    await supabase.from('users').upsert({
      auth_id: user.id,
      email: user.email || '',
      phone: user.phone || '',
      name: String(meta.full_name || meta.name || user.email || user.phone || ''),
      role: 'user',
      plan: 'free',
      subscription_status: 'free',
    }, { onConflict: 'auth_id' });
  }

  if (!isProfileComplete(profile)) {
    response = NextResponse.redirect(new URL(`/${country}/${lang}/onboarding?next=${encodeURIComponent(next)}`, request.url));
  }

  return response;
}
