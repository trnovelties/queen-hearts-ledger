
-- Add ending_jackpot column to weeks table to store the final ending jackpot value
ALTER TABLE weeks ADD COLUMN ending_jackpot numeric DEFAULT 0;

-- Update existing weeks that have winners to calculate and store their ending jackpot
-- This is a one-time migration to populate the new column for existing data
UPDATE weeks 
SET ending_jackpot = weekly_payout 
WHERE winner_name IS NOT NULL AND weekly_payout > 0;
