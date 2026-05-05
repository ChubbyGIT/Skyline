-- ╔══════════════════════════════════════════════════════════════╗
-- ║  NUCLEAR FIX: Remove all triggers blocking signup           ║
-- ║  Run this in Supabase SQL Editor NOW                        ║
-- ╚══════════════════════════════════════════════════════════════╝

-- Step 1: DROP both triggers on auth.users so nothing can block signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_signup_auto_connect ON auth.users;

-- Step 2: Recreate handle_new_user as BULLETPROOF — nothing can crash it
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, email, display_name, username)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(COALESCE(NEW.email, ''), '@', 1)), ' ', '_')) || '_' || SUBSTR(NEW.id::TEXT, 1, 8)
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      display_name = EXCLUDED.display_name
    ;
  EXCEPTION WHEN OTHERS THEN
    -- Swallow ALL errors — never block signup
    RAISE LOG 'handle_new_user failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate handle_invite_auto_connect as BULLETPROOF
CREATE OR REPLACE FUNCTION handle_invite_auto_connect()
RETURNS TRIGGER AS $$
DECLARE
  inv RECORD;
BEGIN
  BEGIN
    FOR inv IN
      SELECT id, inviter_id
      FROM invitations
      WHERE invitee_email = NEW.email
        AND status = 'pending'
    LOOP
      UPDATE invitations SET status = 'accepted' WHERE id = inv.id;
      INSERT INTO friendships (user_a, user_b)
      VALUES (LEAST(inv.inviter_id, NEW.id), GREATEST(inv.inviter_id, NEW.id))
      ON CONFLICT (user_a, user_b) DO NOTHING;
    END LOOP;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'handle_invite_auto_connect failed for %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Re-create both triggers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TRIGGER on_signup_auto_connect
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_invite_auto_connect();
