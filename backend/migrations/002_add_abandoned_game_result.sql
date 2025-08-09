-- Migration: Add 'abandoned' to game_result enum
-- This adds the new 'abandoned' value for inactivity timeouts without affecting existing data

-- First, drop the existing constraint
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_game_result_check;

-- Add the new constraint with 'abandoned' included
ALTER TABLE games ADD CONSTRAINT games_game_result_check 
CHECK (game_result IN ('checkmate', 'stalemate', 'resignation', 'timeout', 'agreement', 'abandoned', NULL));

-- Insert this migration into the tracking table
INSERT INTO schema_migrations (migration_name, description) 
VALUES ('002_add_abandoned_game_result', 'Add abandoned as valid game_result for inactivity timeouts')
ON CONFLICT (migration_name) DO NOTHING;