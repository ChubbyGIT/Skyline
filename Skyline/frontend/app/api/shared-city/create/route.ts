import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-admin';

/**
 * POST /api/shared-city/create
 * Input: { sender_id: string, friend_id: string, city_name?: string }
 *
 * Instantly creates an active shared city between two friends.
 * No invite flow — both users can access immediately.
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

    // Check if a shared city already exists
    const { data: existing } = await supabase
      .from('shared_cities')
      .select('id, status')
      .eq('user_a', a)
      .eq('user_b', b)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'A shared city already exists', shared_city_id: existing.id },
        { status: 409 }
      );
    }

    // Get sender profile for city name
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', sender_id)
      .single();

    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('display_name, username')
      .eq('id', friend_id)
      .single();

    const senderName = senderProfile?.display_name || senderProfile?.username || 'User';
    const friendName = friendProfile?.display_name || friendProfile?.username || 'Friend';
    const finalCityName = city_name || `${senderName} & ${friendName}'s City`;

    // Create the shared city — immediately active
    const { data: sharedCity, error: insertError } = await supabase
      .from('shared_cities')
      .insert({
        user_a: sender_id,
        user_b: friend_id,
        city_name: finalCityName,
        created_by: sender_id,
        status: 'accepted',
      })
      .select('id, city_name')
      .single();

    if (insertError) {
      console.error('Error creating shared city:', insertError.message);
      return NextResponse.json(
        { error: 'Failed to create shared city: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      shared_city_id: sharedCity.id,
      city_name: sharedCity.city_name,
    });
  } catch (err) {
    console.error('Create shared city error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
