-- Migration: Fix piece field length constraints
-- Issue: varchar(10) is too short for "white-knight" and "black-knight" (12 chars)
-- Solution: Increase to varchar(12) to accommodate longest piece names exactly

-- Fix game_moves table piece field
ALTER TABLE game_moves 
ALTER COLUMN piece TYPE VARCHAR(12);

-- Fix game_moves table captured_piece field  
ALTER TABLE game_moves 
ALTER COLUMN captured_piece TYPE VARCHAR(12);

-- Fix game_moves table promotion_piece field
ALTER TABLE game_moves 
ALTER COLUMN promotion_piece TYPE VARCHAR(12);

-- Migration will be recorded automatically by migration runner