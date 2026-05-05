-- ╔══════════════════════════════════════════════════════════════╗
-- ║  DIAGNOSTIC: Find all triggers on auth.users                ║
-- ║  Run this FIRST and share the results                       ║
-- ╚══════════════════════════════════════════════════════════════╝

-- 1. List ALL triggers on auth.users (there might be unexpected ones)
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 2. Check if profiles table exists and its columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Check if there are any existing broken profiles with NULL or duplicate usernames
SELECT username, COUNT(*)
FROM profiles
GROUP BY username
HAVING COUNT(*) > 1;
