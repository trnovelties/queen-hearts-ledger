
-- Clean up incorrect ending_jackpot_total values from individual daily entries
-- Set all daily entries to 0, only weeks should have ending jackpot totals
UPDATE ticket_sales 
SET ending_jackpot_total = 0, 
    displayed_jackpot_total = jackpot_contributions_total
WHERE ending_jackpot_total != 0;

-- Update any weeks that might have incorrect ending jackpot calculations
-- This will be recalculated by the application logic
UPDATE weeks 
SET weekly_payout = 0 
WHERE weekly_payout IS NULL;
