import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Params = Promise<{ country: string; lang: string }>;

export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { country, lang } = await params;
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || `/${country}/${lang}/dashboard`;
  const safeNext = next.startsWith('/') ? next : `/${country}/${lang}/dashboard`;

  const response = NextResponse.redirect(new URL(safeNext, request.url));

  if (!code) {
    return NextResponse.redirect(new URL(`/${country}/${lang}/login?error=missing_code`, request.url));
  }

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

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/${country}/${lang}/login?error=oauth_callback`, request.url));
  }

  // Session cookies are set above. Profile completion is handled inside the dashboard
  // so first-time Google/Phone users must choose username and account type.

  return response;
}
