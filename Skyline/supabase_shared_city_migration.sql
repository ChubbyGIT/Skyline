-- ============================================================
-- Skyline Shared City — Database Migration
-- ============================================================
-- Run this in your Supabase SQL Editor to create all tables,
-- constraints, RLS policies, and indexes for the Shared City
-- feature.
--
-- Prerequisites: profiles, friendships tables must already exist.
-- ============================================================

-- ╔════════════════════════════════════════════════════════════╗
-- ║  1. SHARED CITIES TABLE                                    ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS shared_cities (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    user_b      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    city_name   TEXT NOT NULL DEFAULT 'Our City',
    theme_settings JSONB DEFAULT '{"theme":"night"}'::jsonb,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),

    -- Enforce uniqueness of user pair regardless of ordering
    -- user_a is always the smaller UUID, user_b the larger
    CONSTRAINT shared_cities_pair_unique UNIQUE (user_a, user_b),
    CONSTRAINT shared_cities_different_users CHECK (user_a <> user_b)
);

-- Index for fast lookups by either user
CREATE INDEX IF NOT EXISTS idx_shared_cities_user_a ON shared_cities(user_a);
CREATE INDEX IF NOT EXISTS idx_shared_cities_user_b ON shared_cities(user_b);
CREATE INDEX IF NOT EXISTS idx_shared_cities_status ON shared_cities(status);

-- ╔════════════════════════════════════════════════════════════╗
-- ║  2. SHARED MEMORIES TABLE                                  ║
-- ╚════════════════════════════════════════════════════════════╝
-- Mirrors the existing 'memories' table but scoped to a shared city.

CREATE TABLE IF NOT EXISTS shared_memories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_city_id  UUID NOT NULL REFERENCES shared_cities(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title           TEXT NOT NULL,
    caption         TEXT,
    category        TEXT NOT NULL DEFAULT 'other'
                      CHECK (category IN ('career', 'health', 'relationships', 'personal', 'other')),
    impact          INTEGER NOT NULL DEFAULT 50 CHECK (impact >= 0 AND impact <= 100),
    fondness        INTEGER NOT NULL DEFAULT 50 CHECK (fondness >= 0 AND fondness <= 100),
    date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    image_url       TEXT,
    pos_x           FLOAT,
    pos_z           FLOAT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_memories_city ON shared_memories(shared_city_id);
CREATE INDEX IF NOT EXISTS idx_shared_memories_creator ON shared_memories(created_by);

-- ╔════════════════════════════════════════════════════════════╗
-- ║  3. SHARED CITY USERS (NPC) TABLE                          ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS shared_city_users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_city_id  UUID NOT NULL REFERENCES shared_cities(id) ON DELETE CASCADE,
    created_by      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    gender          TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    color           TEXT NOT NULL DEFAULT '#3b82f6',
    pos_x           FLOAT NOT NULL DEFAULT 0,
    pos_y           FLOAT NOT NULL DEFAULT 0,
    pos_z           FLOAT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_city_users_city ON shared_city_users(shared_city_id);

-- ╔════════════════════════════════════════════════════════════╗
-- ║  4. SHARED CITY ACTIVITY LOG (future-ready)                ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE TABLE IF NOT EXISTS shared_city_activity (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shared_city_id  UUID NOT NULL REFERENCES shared_cities(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action_type     TEXT NOT NULL CHECK (action_type IN (
                      'memory_added', 'memory_deleted', 'building_moved',
                      'npc_added', 'npc_removed', 'theme_changed', 'city_renamed'
                    )),
    metadata        JSONB DEFAULT '{}'::jsonb,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_city_activity_city ON shared_city_activity(shared_city_id);
CREATE INDEX IF NOT EXISTS idx_shared_city_activity_time ON shared_city_activity(created_at DESC);

-- ╔════════════════════════════════════════════════════════════╗
-- ║  5. HELPER FUNCTION: Normalize user pair ordering          ║
-- ╚════════════════════════════════════════════════════════════╝
-- Ensures user_a < user_b to prevent duplicate pairs.

CREATE OR REPLACE FUNCTION normalize_shared_city_pair()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_a > NEW.user_b THEN
        -- Swap so user_a is always the smaller UUID
        DECLARE
            tmp UUID;
        BEGIN
            tmp := NEW.user_a;
            NEW.user_a := NEW.user_b;
            NEW.user_b := tmp;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS normalize_shared_city_pair_trigger ON shared_cities;
CREATE TRIGGER normalize_shared_city_pair_trigger
    BEFORE INSERT OR UPDATE ON shared_cities
    FOR EACH ROW EXECUTE FUNCTION normalize_shared_city_pair();

-- ╔════════════════════════════════════════════════════════════╗
-- ║  6. HELPER FUNCTION: Check if users are friends            ║
-- ╚════════════════════════════════════════════════════════════╝

CREATE OR REPLACE FUNCTION check_shared_city_friendship()
RETURNS TRIGGER AS $$
DECLARE
    a UUID;
    b UUID;
BEGIN
    -- Normalize order
    IF NEW.user_a < NEW.user_b THEN
        a := NEW.user_a; b := NEW.user_b;
    ELSE
        a := NEW.user_b; b := NEW.user_a;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM friendships
        WHERE (user_a = a AND user_b = b)
    ) THEN
        RAISE EXCEPTION 'Users must be friends to create a shared city';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_shared_city_friendship_trigger ON shared_cities;
CREATE TRIGGER check_shared_city_friendship_trigger
    BEFORE INSERT ON shared_cities
    FOR EACH ROW EXECUTE FUNCTION check_shared_city_friendship();

-- ╔════════════════════════════════════════════════════════════╗
-- ║  7. RLS POLICIES                                           ║
-- ╚════════════════════════════════════════════════════════════╝

-- ── shared_cities ──
ALTER TABLE shared_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view shared cities"
    ON shared_cities FOR SELECT
    USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Users can create shared cities"
    ON shared_cities FOR INSERT
    WITH CHECK (auth.uid() = created_by AND (auth.uid() = user_a OR auth.uid() = user_b));

CREATE POLICY "Participants can update shared cities"
    ON shared_cities FOR UPDATE
    USING (auth.uid() = user_a OR auth.uid() = user_b);

CREATE POLICY "Participants can delete shared cities"
    ON shared_cities FOR DELETE
    USING (auth.uid() = user_a OR auth.uid() = user_b);

-- ── shared_memories ──
ALTER TABLE shared_memories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view shared memories"
    ON shared_memories FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_memories.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
              AND sc.status = 'accepted'
        )
    );

CREATE POLICY "Participants can insert shared memories"
    ON shared_memories FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_memories.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
              AND sc.status = 'accepted'
        )
    );

CREATE POLICY "Participants can update shared memories"
    ON shared_memories FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_memories.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
              AND sc.status = 'accepted'
        )
    );

CREATE POLICY "Participants can delete shared memories"
    ON shared_memories FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_memories.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
              AND sc.status = 'accepted'
        )
    );

-- ── shared_city_users (NPCs) ──
ALTER TABLE shared_city_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view shared city NPCs"
    ON shared_city_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_city_users.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
        )
    );

CREATE POLICY "Participants can insert shared city NPCs"
    ON shared_city_users FOR INSERT
    WITH CHECK (
        auth.uid() = created_by
        AND EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_city_users.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
              AND sc.status = 'accepted'
        )
    );

CREATE POLICY "Participants can update shared city NPCs"
    ON shared_city_users FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_city_users.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
        )
    );

CREATE POLICY "Participants can delete shared city NPCs"
    ON shared_city_users FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_city_users.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
        )
    );

-- ── shared_city_activity ──
ALTER TABLE shared_city_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view shared city activity"
    ON shared_city_activity FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_city_activity.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
        )
    );

CREATE POLICY "Participants can insert shared city activity"
    ON shared_city_activity FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM shared_cities sc
            WHERE sc.id = shared_city_activity.shared_city_id
              AND (sc.user_a = auth.uid() OR sc.user_b = auth.uid())
        )
    );

-- ╔════════════════════════════════════════════════════════════╗
-- ║  8. REALTIME PUBLICATION                                   ║
-- ╚════════════════════════════════════════════════════════════╝
-- Enable realtime for shared tables so Supabase Realtime
-- can broadcast changes to connected clients.

ALTER PUBLICATION supabase_realtime ADD TABLE shared_memories;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_city_users;
ALTER PUBLICATION supabase_realtime ADD TABLE shared_cities;
