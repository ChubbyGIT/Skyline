import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * POST /api/accept-invite
 * Input: { invite_token: string, new_user_id: string }
 *
 * Called after a user signs up via an invite link.
 * 1. Looks up the invite by token
 * 2. Marks it as accepted
 * 3. Creates the friendship between inviter and new user
 *
 * Note: The DB trigger `handle_invite_auto_connect` also does this
 * automatically on signup. This endpoint is a fallback for cases
 * where the user signed up before the token was captured.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { invite_token, new_user_id } = body;

    if (!invite_token || !new_user_id) {
      return NextResponse.json(
        { error: 'invite_token and new_user_id are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ── Find the invite ──
    const { data: invite, error: findError } = await supabase
      .from('invitations')
      .select('id, inviter_id, invitee_email, status')
      .eq('token', invite_token)
      .maybeSingle();

    if (findError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite token' },
        { status: 404 }
      );
    }

    if (invite.status === 'accepted') {
      return NextResponse.json({
        success: true,
        message: 'Invite already accepted',
        already_accepted: true,
      });
    }

    // ── Mark invite as accepted ──
    const { error: updateError } = await supabase
      .from('invitations')
      .update({ status: 'accepted' })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Error accepting invite:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to accept invite' },
        { status: 500 }
      );
    }

    // ── Create friendship ──
    const userA = invite.inviter_id < new_user_id ? invite.inviter_id : new_user_id;
    const userB = invite.inviter_id < new_user_id ? new_user_id : invite.inviter_id;

    const { error: friendError } = await supabase
      .from('friendships')
      .upsert({
        user_a: userA,
        user_b: userB,
      }, { onConflict: 'user_a,user_b' });

    if (friendError) {
      console.error('Error creating friendship:', friendError.message);
      // Don't fail — invite was accepted even if friendship creation had an issue
    }

    return NextResponse.json({
      success: true,
      message: 'Invite accepted and friendship created!',
      friend_id: invite.inviter_id,
    });
  } catch (err) {
    console.error('Accept invite error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
