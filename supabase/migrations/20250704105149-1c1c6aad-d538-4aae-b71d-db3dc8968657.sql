-- Fix Game 8 calculations to correct net available for final winner
UPDATE games 
SET 
  net_available_for_final_winner = 430, -- 450 - 10 - 10 = 430
  jackpot_shortfall_covered = 70, -- 500 - 430 = 70
  actual_organization_net_profit = 210 -- 280 - 0 - 0 - 70 = 210
WHERE name = 'Game 8';