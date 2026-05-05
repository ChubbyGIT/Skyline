-- ============================================
-- Skyline NPC Users (Person NPCs) Migration
-- ============================================
-- Run this in your Supabase SQL editor to create
-- the table for storing city NPC users.

-- Create the city_users table
CREATE TABLE IF NOT EXISTS city_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    color TEXT NOT NULL DEFAULT '#3b82f6',
    pos_x FLOAT NOT NULL DEFAULT 0,
    pos_y FLOAT NOT NULL DEFAULT 0,
    pos_z FLOAT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups by owner
CREATE INDEX IF NOT EXISTS idx_city_users_owner_id ON city_users(owner_id);

-- Enable RLS
ALTER TABLE city_users ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can see their own NPC users
CREATE POLICY "Users can view own city_users"
    ON city_users FOR SELECT
    USING (auth.uid() = owner_id);

-- RLS Policy: Users can insert their own NPC users
CREATE POLICY "Users can insert own city_users"
    ON city_users FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- RLS Policy: Users can update their own NPC users
CREATE POLICY "Users can update own city_users"
    ON city_users FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- RLS Policy: Users can delete their own NPC users
CREATE POLICY "Users can delete own city_users"
    ON city_users FOR DELETE
    USING (auth.uid() = owner_id);

-- Allow friends to view city_users (read-only for public city viewing)
CREATE POLICY "Friends can view city_users"
    ON city_users FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM friendships f
            WHERE (f.user_a = auth.uid() AND f.user_b = city_users.owner_id)
               OR (f.user_b = auth.uid() AND f.user_a = city_users.owner_id)
        )
    );
