import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * POST /api/shared-city/decline
 * Input: { shared_city_id: string, user_id: string }
 *
 * Declines (and deletes) a pending shared city invitation.
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

    // Update status to declined
    const { error: updateError } = await supabase
      .from('shared_cities')
      .update({ status: 'declined', updated_at: new Date().toISOString() })
      .eq('id', shared_city_id);

    if (updateError) {
      console.error('Error declining shared city:', updateError.message);
      return NextResponse.json(
        { error: 'Failed to decline shared city' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Shared city invitation declined',
    });
  } catch (err) {
    console.error('Decline shared city error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
