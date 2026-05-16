import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';
import { sendEmail } from '@/lib/mailer';

/**
 * POST /api/shared-city/accept
 * Input: { shared_city_id: string, user_id: string }
 *
 * Accepts a pending shared city invitation.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { shared_city_id, user_id } = body;

    if (!shared_city_id || !user_id) {
      return NextResponse.json(
        { error: 'shared_city_id and user_id are required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch the shared city
    const { data: sharedCity, error: fetchError } = await supabase
      .from('shared_cities')
      .select('*')
      .eq('id', shared_city_id)
      .single();

    if (fetchError || !sharedCity) {
      return NextResponse.json(
        { error: 'Shared city not found' },
        { status: 404 }
      );
    }

    // Verify the user is a participant
    if (sharedCity.user_a !== user_id && sharedCity.user_b !== user_id) {
      return NextResponse.json(
        { error: 'You are not a participant of this shared city' },
        { status: 403 }
      );
    }

    // Verify the user is NOT the one who created it (the other user should accept)
    if (sharedCity.created_by === user_id) {
      return NextResponse.json(
        { error: 'You cannot accept your own invitation' },
        { status: 400 }
      );
    }

    if (sharedCity.status === 'accepted') {
      return NextResponse.json({
        success: true,
        message: 'Shared city already accepted',
        shared_city_id: sharedCity.id,
      });
    }

    if (sharedCity.status !== 'pending') {
      return NextResponse.json(
        { error: 'This invitation is no longer valid' },
        { status: 400 }
      );
    }

    // Accept the shared city
    const { error: updateError } = await supabase
      .from('shared_cities')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', shared_city_id);

    if (updateError) {
      console.error('Error accepting shared city:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to accept shared city' },
        { status: 500 }
      );
    }

    // Notify the creator
    try {
      const { data: accepterProfile } = await supabase
        .from('profiles')
        .select('display_name, username')
        .eq('id', user_id)
        .single();

      const { data: creatorProfile } = await supabase
        .from('profiles')
        .select('email, display_name')
        .eq('id', sharedCity.created_by)
        .single();

      const accepterName = accepterProfile?.display_name || accepterProfile?.username || 'Your friend';

      if (creatorProfile?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://skyline-gw5n.vercel.app';
        await sendEmail({
          to: creatorProfile.email,
          subject: `${accepterName} accepted your shared city invitation! 🎉`,
          html: buildAcceptedEmail(accepterName, sharedCity.city_name, `${appUrl}/shared-city/${sharedCity.id}`),
        });
      }
    } catch (emailErr) {
      console.error('Acceptance notification email failed:', emailErr);
    }

    return NextResponse.json({
      success: true,
      shared_city_id: sharedCity.id,
      city_name: sharedCity.city_name,
      message: 'Shared city accepted! You can now co-build together.',
    });
  } catch (err) {
    console.error('Accept shared city error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildAcceptedEmail(accepterName: string, cityName: string, cityUrl: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:40px auto;background:linear-gradient(145deg,#06281e,#0d3b2e);border-radius:24px;border:1px solid rgba(52,211,153,0.2);overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.6);">
    <div style="padding:32px 32px 0;text-align:center;">
      <div style="font-size:28px;font-weight:700;color:#d1fae5;">🌆 Skyline</div>
      <div style="margin-top:6px;font-size:12px;color:#34d399;letter-spacing:2px;text-transform:uppercase;">Shared City Accepted!</div>
    </div>
    <div style="padding:28px 32px 36px;">
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 20px;">Great news!</p>
      <p style="font-size:16px;color:#d1fae5;line-height:1.8;margin:0 0 24px;">
        <strong style="color:#34d399;">${accepterName}</strong> accepted your invitation to co-build <strong style="color:#a78bfa;">"${cityName}"</strong>. Start adding memories together!
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${cityUrl}" style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#34d399,#10b981);color:#fff;font-size:14px;font-weight:700;text-decoration:none;border-radius:999px;box-shadow:0 8px 25px rgba(16,185,129,0.4);">
          Open Shared City
        </a>
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid rgba(52,211,153,0.1);text-align:center;">
      <span style="font-size:11px;color:#6ee7b750;">Skyline — Your Life, Built in 3D</span>
    </div>
  </div>
</body>
</html>`;
}
