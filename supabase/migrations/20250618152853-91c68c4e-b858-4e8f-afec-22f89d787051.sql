
-- First, let's clean up all existing problematic RLS policies and create proper organization-based isolation

-- Drop all existing policies that might be too permissive
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "config_select_policy" ON public.configurations;
DROP POLICY IF EXISTS "config_update_policy" ON public.configurations;
DROP POLICY IF EXISTS "config_insert_policy" ON public.configurations;
DROP POLICY IF EXISTS "config_delete_policy" ON public.configurations;

-- Add user_id column to configurations table to make it organization-specific
ALTER TABLE public.configurations 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set a default configuration for existing users if configurations table is empty
INSERT INTO public.configurations (user_id, ticket_price, organization_percentage, jackpot_percentage, penalty_percentage, penalty_to_organization, minimum_starting_jackpot)
SELECT DISTINCT u.id, 2, 40, 60, 10, false, 500
FROM public.users u
LEFT JOIN public.configurations c ON c.user_id = u.id
WHERE c.id IS NULL;

-- Create proper RLS policies for users table
CREATE POLICY "users_can_view_own_profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Create proper RLS policies for configurations table
CREATE POLICY "users_can_view_own_configurations" 
ON public.configurations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_configurations" 
ON public.configurations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_configurations" 
ON public.configurations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_configurations" 
ON public.configurations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create proper RLS policies for games table
CREATE POLICY "users_can_view_own_games" 
ON public.games 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_games" 
ON public.games 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_games" 
ON public.games 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_games" 
ON public.games 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create proper RLS policies for weeks table
CREATE POLICY "users_can_view_own_weeks" 
ON public.weeks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_weeks" 
ON public.weeks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_weeks" 
ON public.weeks 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_weeks" 
ON public.weeks 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create proper RLS policies for ticket_sales table
CREATE POLICY "users_can_view_own_ticket_sales" 
ON public.ticket_sales 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_ticket_sales" 
ON public.ticket_sales 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_ticket_sales" 
ON public.ticket_sales 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_ticket_sales" 
ON public.ticket_sales 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create proper RLS policies for expenses table
CREATE POLICY "users_can_view_own_expenses" 
ON public.expenses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_expenses" 
ON public.expenses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_expenses" 
ON public.expenses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create proper RLS policies for organization_rules table
CREATE POLICY "users_can_view_own_organization_rules" 
ON public.organization_rules 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_insert_own_organization_rules" 
ON public.organization_rules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_organization_rules" 
ON public.organization_rules 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_organization_rules" 
ON public.organization_rules 
FOR DELETE 
USING (auth.uid() = user_id);

-- Ensure all tables have RLS enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_rules ENABLE ROW LEVEL SECURITY;
