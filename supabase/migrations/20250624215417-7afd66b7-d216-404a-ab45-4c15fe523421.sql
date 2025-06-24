
-- Fix the date columns to be pure date type without timezone conversion
-- This ensures dates are stored exactly as sent without any timezone shifts

-- Update games table start_date and end_date columns to be pure date type
ALTER TABLE public.games 
ALTER COLUMN start_date TYPE date,
ALTER COLUMN end_date TYPE date;

-- Update weeks table start_date and end_date columns to be pure date type  
ALTER TABLE public.weeks
ALTER COLUMN start_date TYPE date,
ALTER COLUMN end_date TYPE date;

-- Update ticket_sales table date column to be pure date type
ALTER TABLE public.ticket_sales
ALTER COLUMN date TYPE date;

-- Update expenses table date column to be pure date type
ALTER TABLE public.expenses
ALTER COLUMN date TYPE date;
