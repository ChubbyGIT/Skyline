import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/mailer';

/**
 * POST /api/shared-city/create
 * Input: { sender_id: string, friend_id: string, city_name?: string }
 *
 * Creates a pending shared city invitation between two friends.
 * The pair is normalized (smaller UUID = user_a) by the DB trigger.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sender_id, friend_id, city_name } = body;

    if (!sender_id || !friend_id) {
      return NextResponse.json(
        { error: 'sender_id and friend_id are required' },
        { status: 400 }
      );
    }

    if (sender_id === friend_id) {
      return NextResponse.json(
        { error: 'Cannot create a shared city with yourself' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if they are actually friends
    const [a, b] = [sender_id, friend_id].sort();
    const { data: friendship } = await supabase
      .from('friendships')
      .select('id')
      .eq('user_a', a)
      .eq('user_b', b)
      .maybeSingle();

    if (!friendship) {
      return NextResponse.json(
        { error: 'You must be friends to create a shared city' },
        { status: 403 }
      );
    }

    // Check if a shared city already exists (any status)
    const { data: existing } = await supabase
      .from('shared_cities')
      .select('id, status')
      .eq('user_a', a)
      .eq('user_b', b)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { error: 'A shared city already exists between you two', shared_city_id: existing.id },
          { status: 409 }
        );
      }
      if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'A shared city invitation is already pending', shared_city_id: existing.id },
          { status: 409 }
        );
      }
      // If declined, allow re-creation by deleting the old one
      if (existing.status === 'declined') {
        await supabase.from('shared_cities').delete().eq('id', existing.id);
      }
    }

    // Get sender profile for notification
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', sender_id)
      .single();

    const senderName = senderProfile?.display_name || senderProfile?.username || 'Someone';
    const finalCityName = city_name || `${senderName}'s Shared City`;

    // Create the shared city (pending status)
    const { data: sharedCity, error: insertError } = await supabase
      .from('shared_cities')
      .insert({
        user_a: sender_id,
        user_b: friend_id,
        city_name: finalCityName,
        created_by: sender_id,
        status: 'pending',
      })
      .select('id, status, city_name')
      .single();

    if (insertError) {
      console.error('Error creating shared city:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to create shared city: ' + insertError.message },
        { status: 500 }
      );
    }

    // Send notification email to friend
    try {
      const { data: friendProfile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', friend_id)
        .single();

      if (friendProfile?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skyline-gw5n.vercel.app';
        await sendEmail({
          to: friendProfile.email,
          subject: `${senderName} wants to build a shared city with you on Skyline 🌆`,
          html: buildSharedCityInviteEmail(senderName, finalCityName, appUrl),
        });
      }
    } catch (emailErr) {
      console.error('Shared city notification email failed:', emailErr);
      // Non-blocking — city invite is still valid
    }

    return NextResponse.json({
      success: true,
      shared_city_id: sharedCity.id,
      city_name: sharedCity.city_name,
      message: 'Shared city invitation sent!',
    });
  } catch (err) {
    console.error('Create shared city error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildSharedCityInviteEmail(senderName: string, cityName: string, appUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(145deg,#06281e,#0d3b2e);border-radius:24px;border:1px solid rgba(52,211,153,0.2);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
    <div style="padding:32px 32px 0;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#d1fae5;letter-spacing:-0.5px;">
        🌆 Skyline
      </div>
      <div style="margin-top:6px;font-size:12px;color:#a78bfa;letter-spacing:2px;text-transform:uppercase;">
        Shared City Invitation
      </div>
    </div>
    <div style="padding:28px 32px 36px;">
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 20px;">Hi there,</p>
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 24px;">
        <strong style="color:#34d399;">${senderName}</strong> wants to build a shared city with you called <strong style="color:#a78bfa;">"${cityName}"</strong>. Accept the invitation to start co-building your memories together!
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${appUrl}/city" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#a78bfa,#7c3aed);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;letter-spacing:0.5px;box-shadow:0 8px 25px rgba(139,92,246,0.4);">
          View Invitation
        </a>
      </div>
      <p style="font-size:13px;color:#6ee7b780;line-height:1.6;margin:0;text-align:center;">
        If you didn't expect this invitation, you can safely ignore it.
      </p>
    </div>
    <div style="padding:16px 32px;border-top:1px solid rgba(52,211,153,0.1);text-align:center;">
      <span style="font-size:11px;color:#6ee7b750;">Skyline — Your Life, Built in 3D</span>
    </div>
  </div>
</body>
</html>`;
}
