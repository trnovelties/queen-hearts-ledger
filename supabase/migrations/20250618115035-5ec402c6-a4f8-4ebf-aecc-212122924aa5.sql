
-- Add user_id column to games table to associate games with users
ALTER TABLE public.games 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing games to have a user_id (assign to first user if any exist)
-- This is just for existing data - new games will automatically get user_id
UPDATE public.games 
SET user_id = (SELECT id FROM auth.users LIMIT 1) 
WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users);

-- Make user_id NOT NULL after updating existing records
ALTER TABLE public.games 
ALTER COLUMN user_id SET NOT NULL;

-- Add user_id to weeks table (cascade from games)
ALTER TABLE public.weeks 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update weeks to inherit user_id from their games
UPDATE public.weeks 
SET user_id = (SELECT user_id FROM public.games WHERE games.id = weeks.game_id)
WHERE user_id IS NULL;

-- Make user_id NOT NULL for weeks
ALTER TABLE public.weeks 
ALTER COLUMN user_id SET NOT NULL;

-- Add user_id to ticket_sales table
ALTER TABLE public.ticket_sales 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update ticket_sales to inherit user_id from their games
UPDATE public.ticket_sales 
SET user_id = (SELECT user_id FROM public.games WHERE games.id = ticket_sales.game_id)
WHERE user_id IS NULL;

-- Make user_id NOT NULL for ticket_sales
ALTER TABLE public.ticket_sales 
ALTER COLUMN user_id SET NOT NULL;

-- Add user_id to expenses table
ALTER TABLE public.expenses 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update expenses to inherit user_id from their games
UPDATE public.expenses 
SET user_id = (SELECT user_id FROM public.games WHERE games.id = expenses.game_id)
WHERE user_id IS NULL;

-- Make user_id NOT NULL for expenses
ALTER TABLE public.expenses 
ALTER COLUMN user_id SET NOT NULL;

-- Add user_id to organization_rules table for per-organization rules
ALTER TABLE public.organization_rules 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Update existing organization_rules to have a user_id
UPDATE public.organization_rules 
SET user_id = (SELECT id FROM auth.users LIMIT 1) 
WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM auth.users);

-- Make user_id NOT NULL for organization_rules
ALTER TABLE public.organization_rules 
ALTER COLUMN user_id SET NOT NULL;

-- Enable Row Level Security on all tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for games table
CREATE POLICY "Users can view their own games" 
  ON public.games 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own games" 
  ON public.games 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own games" 
  ON public.games 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own games" 
  ON public.games 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for weeks table
CREATE POLICY "Users can view their own weeks" 
  ON public.weeks 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own weeks" 
  ON public.weeks 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weeks" 
  ON public.weeks 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weeks" 
  ON public.weeks 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for ticket_sales table
CREATE POLICY "Users can view their own ticket sales" 
  ON public.ticket_sales 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own ticket sales" 
  ON public.ticket_sales 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ticket sales" 
  ON public.ticket_sales 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ticket sales" 
  ON public.ticket_sales 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for expenses table
CREATE POLICY "Users can view their own expenses" 
  ON public.expenses 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own expenses" 
  ON public.expenses 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses" 
  ON public.expenses 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses" 
  ON public.expenses 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create RLS policies for organization_rules table
CREATE POLICY "Users can view their own organization rules" 
  ON public.organization_rules 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own organization rules" 
  ON public.organization_rules 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own organization rules" 
  ON public.organization_rules 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own organization rules" 
  ON public.organization_rules 
  FOR DELETE 
  USING (auth.uid() = user_id);
