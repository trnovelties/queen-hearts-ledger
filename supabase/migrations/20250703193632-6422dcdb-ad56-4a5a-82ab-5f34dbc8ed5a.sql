-- Add new columns to games table to store detailed financial calculations
ALTER TABLE public.games 
ADD COLUMN actual_organization_net_profit NUMERIC DEFAULT 0,
ADD COLUMN weekly_payouts_distributed NUMERIC DEFAULT 0,
ADD COLUMN final_jackpot_payout NUMERIC DEFAULT 0,
ADD COLUMN total_jackpot_contributions NUMERIC DEFAULT 0,
ADD COLUMN net_available_for_final_winner NUMERIC DEFAULT 0,
ADD COLUMN jackpot_shortfall_covered NUMERIC DEFAULT 0,
ADD COLUMN game_duration_weeks INTEGER DEFAULT 0;