import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/mailer';

/**
 * POST /api/friend-request-notify
 * Input: { sender_id: string, receiver_id: string }
 *
 * Sends a notification email to the receiver that they have a new friend request.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender_id, receiver_id } = body;

    if (!sender_id || !receiver_id) {
      return NextResponse.json(
        { error: 'sender_id and receiver_id are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch sender profile
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, username, email')
      .eq('id', sender_id)
      .single();

    // Fetch receiver profile (we need their email)
    const { data: receiverProfile } = await supabase
      .from('profiles')
      .select('display_name, username, email')
      .eq('id', receiver_id)
      .single();

    if (!receiverProfile?.email) {
      return NextResponse.json(
        { error: 'Receiver email not found' },
        { status: 404 }
      );
    }

    const senderName =
      senderProfile?.display_name ||
      senderProfile?.username ||
      senderProfile?.email ||
      'Someone';

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skyline-gw5n.vercel.app';

    // Send email via Gmail SMTP
    try {
      console.log(`Sending friend request email to: ${receiverProfile.email}, from sender: ${senderName}`);

      await sendEmail({
        to: receiverProfile.email,
        subject: `${senderName} sent you a friend request on Skyline`,
        html: buildFriendRequestEmail(senderName, appUrl),
      });

      console.log('Friend request notification email sent successfully');
    } catch (emailErr) {
      console.error('Email sending failed:', emailErr);
      return NextResponse.json(
        { error: 'Email service error', details: String(emailErr) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Friend request notify error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Branded HTML email for friend request notifications.
 */
function buildFriendRequestEmail(senderName: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(145deg,#06281e,#0d3b2e);border-radius:24px;border:1px solid rgba(52,211,153,0.2);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
    <!-- Header -->
    <div style="padding:32px 32px 0;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#d1fae5;letter-spacing:-0.5px;">
        🌆 Skyline
      </div>
      <div style="margin-top:6px;font-size:12px;color:#6ee7b7;letter-spacing:2px;text-transform:uppercase;">
        Friend Request
      </div>
    </div>

    <!-- Body -->
    <div style="padding:28px 32px 36px;">
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 20px;">Hi there,</p>
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 24px;">
        You've received a friend request from <strong style="color:#34d399;">${senderName}</strong> on Skyline. Log in to accept it and start exploring each other's cities!
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#34d399,#10b981);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;letter-spacing:0.5px;box-shadow:0 8px 25px rgba(16,185,129,0.4);">
          Open Skyline
        </a>
      </div>
      <p style="font-size:13px;color:#6ee7b780;line-height:1.6;margin:0;text-align:center;">
        If you didn't expect this request, you can safely ignore this email.
      </p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 32px;border-top:1px solid rgba(52,211,153,0.1);text-align:center;">
      <span style="font-size:11px;color:#6ee7b750;">Skyline — Your Life, Built in 3D</span>
    </div>
  </div>
</body>
</html>`;
}
