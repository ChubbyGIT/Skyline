import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * POST /api/send-invite
 * Input: { sender_id: string, receiver_email: string }
 *
 * 1. Validates rate limit (max 5 invites/day)
 * 2. Checks for duplicate pending invites
 * 3. Inserts invite with unique token
 * 4. Sends email via Resend
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender_id, receiver_email } = body;

    if (!sender_id || !receiver_email) {
      return NextResponse.json(
        { error: 'sender_id and receiver_email are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = receiver_email.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ── Check if user already exists ──
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .ilike('email', normalizedEmail)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { error: 'User already exists. Send a friend request instead.' },
        { status: 409 }
      );
    }

    // ── Rate limit: max 5 invites per 24h ──
    const { data: rateCheck } = await supabase
      .rpc('check_invite_rate_limit', { p_user_id: sender_id });

    if (rateCheck === false) {
      return NextResponse.json(
        { error: 'Rate limit reached. You can send a maximum of 5 invites per day.' },
        { status: 429 }
      );
    }

    // ── Check for duplicate pending invite ──
    const { data: existingInvite } = await supabase
      .from('invitations')
      .select('id')
      .eq('inviter_id', sender_id)
      .eq('invitee_email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invite to this email is already pending.' },
        { status: 409 }
      );
    }

    // ── Get sender's display name ──
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', sender_id)
      .single();

    const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';

    // ── Insert invite with auto-generated token ──
    const { data: invite, error: insertError } = await supabase
      .from('invitations')
      .insert({
        inviter_id: sender_id,
        invitee_email: normalizedEmail,
        message: `${senderName} invited you to Skyline!`,
      })
      .select('id, token')
      .single();

    if (insertError) {
      console.error('Error creating invite:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      );
    }

    // ── Build invite URL ──
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skyline-gw5n.vercel.app';
    const inviteUrl = `${appUrl}?invite_token=${invite.token}`;

    // ── Send email via Resend ──
    try {
      const senderEmail = (await supabase.from('profiles').select('email').eq('id', sender_id).single()).data?.email || '';

      const { error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'Skyline <onboarding@resend.dev>',
        to: normalizedEmail,
        subject: "You're invited to Skyline 🌆",
        html: buildInviteEmail(senderEmail, inviteUrl),
      });

      if (emailError) {
        console.error('Resend email error:', emailError);
        // Don't fail the invite — it's stored in DB even if email fails
      }
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      // Invite is still valid in DB — user can share the link manually
    }

    return NextResponse.json({
      success: true,
      invite_id: invite.id,
      invite_url: inviteUrl,
      message: `Invite sent to ${normalizedEmail}`,
    });
  } catch (err) {
    console.error('Send invite error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Beautiful HTML email template for the invite.
 */
function buildInviteEmail(senderEmail: string, inviteUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(145deg,#06281e,#0d3b2e);border-radius:24px;border:1px solid rgba(52,211,153,0.2);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
    <div style="padding:36px 32px;">
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 20px;">Hi,</p>
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 24px;">
        You have been invited to try <strong style="color:#34d399;">Skyline</strong>, a 3D spatial diary by <strong style="color:#34d399;">${senderEmail}</strong>
      </p>
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 8px;">Try it out here:</p>
      <p style="margin:0 0 8px;"><a href="${inviteUrl}" style="color:#34d399;font-size:15px;word-break:break-all;">${inviteUrl}</a></p>
    </div>
  </div>
</body>
</html>`;
}
