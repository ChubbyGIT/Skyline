import { supabase } from './supabase';

/** Triggers Google OAuth → lands on /city (implicit flow, hash fragment) */
export async function loginWithGoogle() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Preserve invite_token through OAuth flow
  let redirectUrl = `${origin}/city`;
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite_token');
    if (inviteToken) {
      redirectUrl += `?invite_token=${inviteToken}`;
    }
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: redirectUrl },
  });
  if (error) console.error('OAuth error:', error.message);
}


