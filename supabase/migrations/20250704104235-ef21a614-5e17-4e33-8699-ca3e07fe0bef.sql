-- Fix Game 8 calculations with corrected jackpot logic
UPDATE games 
SET 
  net_available_for_final_winner = total_jackpot_contributions - weekly_payouts_distributed - jackpot_contribution_to_next_game,
  jackpot_shortfall_covered = GREATEST(0, 500 - (total_jackpot_contributions - weekly_payouts_distributed - jackpot_contribution_to_next_game)),
  actual_organization_net_profit = organization_net_profit - total_expenses - total_donations - GREATEST(0, 500 - (total_jackpot_contributions - weekly_payouts_distributed - jackpot_contribution_to_next_game))
WHERE name = 'Game 8';