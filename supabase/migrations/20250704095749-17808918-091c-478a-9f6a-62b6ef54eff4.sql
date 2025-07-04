-- Recalculate Game 7 organization totals with correct 40% calculation
UPDATE games 
SET 
  organization_net_profit = total_sales * 0.40,
  actual_organization_net_profit = (total_sales * 0.40) - total_expenses - total_donations - COALESCE(jackpot_shortfall_covered, 0)
WHERE id = '1f63a988-0f3f-4bd1-9822-99efb69a95bc';