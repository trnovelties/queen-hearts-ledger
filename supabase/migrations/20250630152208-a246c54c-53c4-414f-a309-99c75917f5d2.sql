
-- Add jackpot contribution tracking column to games table
ALTER TABLE games ADD COLUMN jackpot_contribution_to_next_game numeric DEFAULT 0 NOT NULL;
