
-- Add new columns to track jackpot contributions vs displayed jackpot
ALTER TABLE ticket_sales 
ADD COLUMN jackpot_contributions_total numeric DEFAULT 0,
ADD COLUMN displayed_jackpot_total numeric DEFAULT 0;

-- Add minimum starting jackpot to games table if not exists
ALTER TABLE games 
ADD COLUMN IF NOT EXISTS minimum_starting_jackpot numeric DEFAULT 500;

-- Update existing records to set initial values
-- For existing records, set jackpot_contributions_total = jackpot_total
-- and displayed_jackpot_total = ending_jackpot_total
UPDATE ticket_sales 
SET jackpot_contributions_total = jackpot_total,
    displayed_jackpot_total = ending_jackpot_total
WHERE jackpot_contributions_total = 0;

-- Add a function to calculate proper jackpot display based on minimum threshold
CREATE OR REPLACE FUNCTION calculate_displayed_jackpot(
  contributions_total numeric,
  minimum_jackpot numeric,
  carryover_jackpot numeric DEFAULT 0
) 
RETURNS numeric 
LANGUAGE plpgsql
AS $$
BEGIN
  -- If contributions haven't reached minimum, show minimum + carryover
  IF contributions_total < minimum_jackpot THEN
    RETURN minimum_jackpot + carryover_jackpot;
  ELSE
    -- Once threshold is met, show contributions + carryover
    RETURN contributions_total + carryover_jackpot;
  END IF;
END;
$$;
