-- ╔══════════════════════════════════════════════════╗
-- ║  FIX: Remove public read policy on memories      ║
-- ║  Run this in Supabase SQL Editor NOW              ║
-- ╚══════════════════════════════════════════════════╝

-- Step 1: Drop the bad policy that lets everyone see all memories
DROP POLICY IF EXISTS "Public can read memories for city viewing" ON memories;

-- Step 2: Create the correct policy — only owner OR friends can read
CREATE POLICY "Friends can read memories for city viewing" ON memories
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM friendships
      WHERE (user_a = auth.uid() AND user_b = memories.user_id)
         OR (user_b = auth.uid() AND user_a = memories.user_id)
    )
  );
