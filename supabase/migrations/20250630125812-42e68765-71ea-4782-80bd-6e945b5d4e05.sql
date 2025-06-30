
-- Add game_profit_loss column to games table to track game performance separately from organization profit
ALTER TABLE public.games 
ADD COLUMN game_profit_loss numeric DEFAULT 0;

-- Update the column to be NOT NULL with default 0
ALTER TABLE public.games 
ALTER COLUMN game_profit_loss SET NOT NULL;
