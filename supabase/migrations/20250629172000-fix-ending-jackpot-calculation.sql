
-- Fix the current incorrect ending jackpot value
-- Week 1 should have ending jackpot = carryover_jackpot + week_contributions - weekly_payout
-- Based on the data: 0 + 219.60 - 25 = 194.60

UPDATE weeks 
SET ending_jackpot = 194.60 
WHERE week_number = 1 
  AND ending_jackpot = 25 
  AND weekly_payout = 25;

-- Add comment for future reference
COMMENT ON COLUMN weeks.ending_jackpot IS 'Stores the final jackpot amount after payout: previous_ending_jackpot + week_contributions - weekly_payout';
