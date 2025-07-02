-- Fix the ending_jackpot for Game 2, Week 7 
-- When Queen of Hearts is won, the ending jackpot should be 0 since the winner gets the full amount
UPDATE weeks 
SET ending_jackpot = 0 
WHERE game_id = 'c1c7c26e-14eb-4000-9c0e-f453f3dcb008' 
  AND week_number = 7 
  AND card_selected = 'Queen of Hearts';