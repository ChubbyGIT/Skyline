import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * OAuth callback route for Supabase PKCE flow.
 * After Google OAuth, Supabase redirects here with ?code=...
 * We exchange the code for a session, then redirect to /city.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const inviteToken = searchParams.get('invite_token');

  // Build the redirect destination
  let redirectTo = `${origin}/city`;
  if (inviteToken) {
    redirectTo += `?invite_token=${inviteToken}`;
  }

  if (code) {
    const response = NextResponse.redirect(redirectTo);

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

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('OAuth code exchange error:', error.message);
      return NextResponse.redirect(`${origin}/?error=auth_failed`);
    }

    return response;
  }

  // No code parameter — redirect to home
  return NextResponse.redirect(`${origin}/`);
}
