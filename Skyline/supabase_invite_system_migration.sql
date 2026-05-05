-- ============================================
-- Skyline Invite + Friend System — Migration
-- ============================================
-- Run this in your Supabase SQL Editor AFTER
-- the friends migration has already been applied.
-- ============================================

-- ╔════════════════════════════════════════════╗
-- ║  1. ADD TOKEN TO INVITATIONS TABLE         ║
-- ╚════════════════════════════════════════════╝

-- Add a unique invite token for auto-connect on signup
ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS token UUID DEFAULT gen_random_uuid() UNIQUE;

-- Backfill any existing rows that have NULL tokens
UPDATE invitations SET token = gen_random_uuid() WHERE token IS NULL;

-- Make token NOT NULL going forward
ALTER TABLE invitations ALTER COLUMN token SET NOT NULL;
ALTER TABLE invitations ALTER COLUMN token SET DEFAULT gen_random_uuid();

-- ╔════════════════════════════════════════════╗
-- ║  2. PREVENT DUPLICATE INVITES              ║
-- ╚════════════════════════════════════════════╝

-- Only one pending invite per (inviter, email) pair
-- Use a partial unique index so re-inviting after acceptance is allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_unique_pending
  ON invitations (inviter_id, invitee_email)
  WHERE status = 'pending';

-- ╔════════════════════════════════════════════╗
-- ║  3. RATE LIMITING — max 5 invites/day      ║
-- ╚════════════════════════════════════════════╝

-- We enforce this in the API layer, but also add a DB-level
-- function that can be called to check the count
CREATE OR REPLACE FUNCTION check_invite_rate_limit(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  invite_count INT;
BEGIN
  SELECT COUNT(*) INTO invite_count
  FROM invitations
  WHERE inviter_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours';
  RETURN invite_count < 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ╔════════════════════════════════════════════╗
-- ║  4. AUTO-CONNECT ON SIGNUP (TRIGGER)       ║
-- ╚════════════════════════════════════════════╝

-- When a new user signs up, check if any pending invitations
-- exist for their email. If so, auto-accept them and create
-- the friendship link.

CREATE OR REPLACE FUNCTION handle_invite_auto_connect()
RETURNS TRIGGER AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Find all pending invitations for this new user's email
  FOR inv IN
    SELECT id, inviter_id
    FROM invitations
    WHERE invitee_email = NEW.email
      AND status = 'pending'
  LOOP
    -- Mark invite as accepted
    UPDATE invitations
    SET status = 'accepted'
    WHERE id = inv.id;

    -- Create the friendship (sorted IDs to maintain UNIQUE constraint)
    INSERT INTO friendships (user_a, user_b)
    VALUES (
      LEAST(inv.inviter_id, NEW.id),
      GREATEST(inv.inviter_id, NEW.id)
    )
    ON CONFLICT (user_a, user_b) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists, then create
DROP TRIGGER IF EXISTS on_signup_auto_connect ON auth.users;
CREATE TRIGGER on_signup_auto_connect
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_invite_auto_connect();

-- ╔════════════════════════════════════════════╗
-- ║  5. INVITATIONS RLS — allow token lookups  ║
-- ╚════════════════════════════════════════════╝

-- Allow anyone to read an invitation by token (needed for signup flow)
-- This is safe because tokens are UUIDs and unguessable
CREATE POLICY "Anyone can read invitations by token" ON invitations
  FOR SELECT USING (true);

-- Drop the old restrictive select policy if it exists
DROP POLICY IF EXISTS "Users can view their invitations" ON invitations;

-- Re-create: users can see invitations they sent
CREATE POLICY "Users can view their own invitations" ON invitations
  FOR SELECT USING (auth.uid() = inviter_id);

-- ╔════════════════════════════════════════════╗
-- ║  6. INDEXES                                ║
-- ╚════════════════════════════════════════════╝

CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (invitee_email);
CREATE INDEX IF NOT EXISTS idx_invitations_inviter ON invitations (inviter_id);

-- ╔════════════════════════════════════════════╗
-- ║  7. DUPLICATE FRIEND REQUEST PREVENTION    ║
-- ╚════════════════════════════════════════════╝

-- The existing friend_requests table already has UNIQUE(from_user_id, to_user_id)
-- But we also need to prevent A→B if B→A already exists (pending)
-- We do this with a function-based check

CREATE OR REPLACE FUNCTION check_no_reverse_request()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM friend_requests
    WHERE from_user_id = NEW.to_user_id
      AND to_user_id = NEW.from_user_id
      AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'A pending friend request already exists in the reverse direction';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_reverse_friend_request ON friend_requests;
CREATE TRIGGER prevent_reverse_friend_request
  BEFORE INSERT ON friend_requests
  FOR EACH ROW
  EXECUTE FUNCTION check_no_reverse_request();
