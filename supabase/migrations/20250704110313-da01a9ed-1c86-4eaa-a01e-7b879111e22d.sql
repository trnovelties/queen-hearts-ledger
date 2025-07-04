-- Final corrective update for Game 8 after fixing the useGameTotalsUpdater hook
-- Ensure the correct values are set and won't be overwritten by the hook
UPDATE games 
SET 
  net_available_for_final_winner = 430, -- 450 total contributions - 10 weekly payouts - 10 next game = 430
  jackpot_shortfall_covered = 70, -- 500 minimum - 430 available = 70 shortfall  
  actual_organization_net_profit = 210 -- 280 org profit - 0 expenses - 0 donations - 70 shortfall = 210
WHERE name = 'Game 8';