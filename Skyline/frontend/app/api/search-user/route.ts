import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * POST /api/search-user
 * Input: { email: string }
 * Output: { exists: true, user_id, display_name, username } | { exists: false }
 *
 * Searches for a user by exact email match in the profiles table.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Search in profiles table (which has the email from auth)
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, display_name, username, email')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (error) {
      console.error('Error searching user:', error.message);
      return NextResponse.json(
        { error: 'Failed to search user' },
        { status: 500 }
      );
    }

    if (profile) {
      return NextResponse.json({
        exists: true,
        user_id: profile.id,
        display_name: profile.display_name,
        username: profile.username,
      });
    }

    return NextResponse.json({ exists: false });
  } catch (err) {
    console.error('Search user error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
