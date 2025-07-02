-- Update Game 2's week 7 final jackpot winner payout to correct amount
UPDATE weeks 
SET weekly_payout = 2783.60 
WHERE game_id = 'c1c7c26e-14eb-4000-9c0e-f453f3dcb008' 
  AND week_number = 7 
  AND card_selected = 'Queen of Hearts';

-- Update Game 2's total payouts to reflect correct final winner amount
-- Total payouts should be: weekly payouts (160) + final jackpot winner (2783.60) = 2943.60
UPDATE games 
SET total_payouts = 2943.60
WHERE id = 'c1c7c26e-14eb-4000-9c0e-f453f3dcb008';