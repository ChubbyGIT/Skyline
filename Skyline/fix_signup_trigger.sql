-- ╔══════════════════════════════════════════════════════════════╗
-- ║  FIX: "Database error saving new user" on signup            ║
-- ║  Run this in Supabase SQL Editor NOW                        ║
-- ╚══════════════════════════════════════════════════════════════╝
-- The handle_new_user() trigger was crashing because:
--   1. ON CONFLICT (id) doesn't catch username UNIQUE violations
--   2. Username only uses 4 chars of UUID — easy collisions
--   3. Any error in the trigger blocks auth.users INSERT entirely
--
-- Fix: Use 8 chars of UUID for uniqueness + wrap in exception
-- handler so signup NEVER fails even if profile creation has issues.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  base_name TEXT;
  final_username TEXT;
BEGIN
  -- Build a display name from Google metadata or email
  base_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );

  -- Generate username: lowercase name + 8 chars of UUID (virtually collision-proof)
  final_username := LOWER(REPLACE(base_name, ' ', '_')) || '_' || SUBSTR(NEW.id::TEXT, 1, 8);

  -- Try to insert the profile; if ANYTHING fails, log it but don't block signup
  BEGIN
    INSERT INTO public.profiles (id, email, display_name, username)
    VALUES (
      NEW.id,
      NEW.email,
      base_name,
      final_username
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name;
  EXCEPTION WHEN unique_violation THEN
    -- Username collision (extremely rare with 8 chars) — append more randomness
    BEGIN
      INSERT INTO public.profiles (id, email, display_name, username)
      VALUES (
        NEW.id,
        NEW.email,
        base_name,
        final_username || '_' || SUBSTR(gen_random_uuid()::TEXT, 1, 4)
      )
      ON CONFLICT (id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not create profile for user %: %', NEW.id, SQLERRM;
    END;
  WHEN OTHERS THEN
    -- Never block signup — log and continue
    RAISE WARNING 'handle_new_user error for %: %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
