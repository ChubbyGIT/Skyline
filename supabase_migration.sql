-- Run this inside your Supabase SQL Editor to link and persist building coordinates

ALTER TABLE memories
ADD COLUMN pos_x FLOAT,
ADD COLUMN pos_z FLOAT;

-- (Optional) If you want to log what happens later:
-- CREATE INDEX idx_memories_pos ON memories(pos_x, pos_z);

-- Add caption field (optional text field for memory descriptions)
ALTER TABLE memories
ADD COLUMN caption TEXT DEFAULT NULL;
