
-- More comprehensive cleanup of existing policies
DROP POLICY IF EXISTS "users_can_view_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_insert_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_update_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_delete_own_games" ON public.games;
DROP POLICY IF EXISTS "admins_can_view_all_games" ON public.games;

DROP POLICY IF EXISTS "users_can_view_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_insert_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_update_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_delete_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "admins_can_view_all_weeks" ON public.weeks;

DROP POLICY IF EXISTS "users_can_view_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_insert_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_update_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_delete_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "admins_can_view_all_ticket_sales" ON public.ticket_sales;

DROP POLICY IF EXISTS "users_can_view_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_insert_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_update_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_delete_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "admins_can_view_all_expenses" ON public.expenses;

DROP POLICY IF EXISTS "users_can_view_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_update_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_insert_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_delete_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "admins_can_view_all_configurations" ON public.configurations;

DROP POLICY IF EXISTS "users_can_view_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_insert_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_update_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_delete_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "admins_can_view_all_organization_rules" ON public.organization_rules;

-- Drop existing users table policies that might conflict
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "admins_can_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admins_can_update_all_users" ON public.users;

-- Enable RLS on all tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for GAMES table
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

CREATE POLICY "admins_can_view_all_games" 
ON public.games 
FOR SELECT 
USING (public.is_current_user_admin());

-- Create comprehensive RLS policies for WEEKS table
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

CREATE POLICY "admins_can_view_all_weeks" 
ON public.weeks 
FOR SELECT 
USING (public.is_current_user_admin());

-- Create comprehensive RLS policies for TICKET_SALES table
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

CREATE POLICY "admins_can_view_all_ticket_sales" 
ON public.ticket_sales 
FOR SELECT 
USING (public.is_current_user_admin());

-- Create comprehensive RLS policies for EXPENSES table
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

CREATE POLICY "admins_can_view_all_expenses" 
ON public.expenses 
FOR SELECT 
USING (public.is_current_user_admin());

-- Create comprehensive RLS policies for CONFIGURATIONS table
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

CREATE POLICY "admins_can_view_all_configurations" 
ON public.configurations 
FOR SELECT 
USING (public.is_current_user_admin());

-- Create comprehensive RLS policies for ORGANIZATION_RULES table
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

CREATE POLICY "admins_can_view_all_organization_rules" 
ON public.organization_rules 
FOR SELECT 
USING (public.is_current_user_admin());

-- Create fresh policies for USERS table
CREATE POLICY "users_can_view_own_profile" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "admins_can_view_all_users" 
ON public.users 
FOR SELECT 
USING (public.is_current_user_admin());

CREATE POLICY "admins_can_update_all_users" 
ON public.users 
FOR UPDATE 
USING (public.is_current_user_admin());
