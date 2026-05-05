-- ╔══════════════════════════════════════════════════════════════╗
-- ║  CRITICAL: Fix data isolation on memories table             ║
-- ║  Run this in Supabase SQL Editor IMMEDIATELY                ║
-- ╚══════════════════════════════════════════════════════════════╝

-- ================================================================
-- STEP 1: ENABLE RLS ON MEMORIES TABLE
-- If this was never run, ALL policies are ignored and anyone
-- can read/write any row. This is the most likely root cause.
-- ================================================================
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 2: DROP any overly-permissive policies that may exist
-- ================================================================
DROP POLICY IF EXISTS "Public can read memories for city viewing" ON memories;
DROP POLICY IF EXISTS "Enable read access for all users" ON memories;
DROP POLICY IF EXISTS "Enable insert for all users" ON memories;
DROP POLICY IF EXISTS "Enable update for all users" ON memories;
DROP POLICY IF EXISTS "Enable delete for all users" ON memories;
-- Also drop the old SELECT policy so we can recreate it cleanly
DROP POLICY IF EXISTS "Friends can read memories for city viewing" ON memories;
DROP POLICY IF EXISTS "Users can CRUD own memories" ON memories;
DROP POLICY IF EXISTS "Owner can read own memories" ON memories;
DROP POLICY IF EXISTS "Owner can insert own memories" ON memories;
DROP POLICY IF EXISTS "Owner can update own memories" ON memories;
DROP POLICY IF EXISTS "Owner can delete own memories" ON memories;

-- ================================================================
-- STEP 3: CREATE strict user-scoped policies
-- ================================================================

-- SELECT: Owner can read own memories, friends can read (for city viewing)
CREATE POLICY "Owner or friends can read memories"
  ON memories FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_a = auth.uid() AND user_b = memories.user_id)
         OR (user_b = auth.uid() AND user_a = memories.user_id)
    )
  );

-- INSERT: Only the owner can insert memories for themselves
CREATE POLICY "Owner can insert own memories"
  ON memories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: Only the owner can update their own memories
CREATE POLICY "Owner can update own memories"
  ON memories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Only the owner can delete their own memories
CREATE POLICY "Owner can delete own memories"
  ON memories FOR DELETE
  USING (auth.uid() = user_id);

-- ================================================================
-- STEP 4: Verify RLS is enabled on ALL other tables too
-- (These should already be enabled but let's be safe)
-- ================================================================
ALTER TABLE city_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- STEP 5: Verify with a quick check (run this SELECT separately)
-- It should return 'true' for every table listed.
-- ================================================================
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
--   AND tablename IN ('memories', 'city_users', 'profiles',
--                     'friend_requests', 'friendships', 'invitations');
