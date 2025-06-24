
-- Update RLS policies to allow admins to view all data across organizations

-- Drop existing restrictive policies and create admin-friendly ones for games table
DROP POLICY IF EXISTS "users_can_view_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_insert_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_update_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_delete_own_games" ON public.games;

CREATE POLICY "users_can_view_own_games_or_admin_can_view_all" 
ON public.games 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_insert_own_games" 
ON public.games 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_games_or_admin_can_update_all" 
ON public.games 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_delete_own_games_or_admin_can_delete_all" 
ON public.games 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Update weeks table policies
DROP POLICY IF EXISTS "users_can_view_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_insert_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_update_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_delete_own_weeks" ON public.weeks;

CREATE POLICY "users_can_view_own_weeks_or_admin_can_view_all" 
ON public.weeks 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_insert_own_weeks" 
ON public.weeks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_weeks_or_admin_can_update_all" 
ON public.weeks 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_delete_own_weeks_or_admin_can_delete_all" 
ON public.weeks 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Update ticket_sales table policies
DROP POLICY IF EXISTS "users_can_view_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_insert_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_update_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_delete_own_ticket_sales" ON public.ticket_sales;

CREATE POLICY "users_can_view_own_ticket_sales_or_admin_can_view_all" 
ON public.ticket_sales 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_insert_own_ticket_sales" 
ON public.ticket_sales 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_ticket_sales_or_admin_can_update_all" 
ON public.ticket_sales 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_delete_own_ticket_sales_or_admin_can_delete_all" 
ON public.ticket_sales 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Update expenses table policies
DROP POLICY IF EXISTS "users_can_view_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_insert_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_update_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_delete_own_expenses" ON public.expenses;

CREATE POLICY "users_can_view_own_expenses_or_admin_can_view_all" 
ON public.expenses 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_insert_own_expenses" 
ON public.expenses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_expenses_or_admin_can_update_all" 
ON public.expenses 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_delete_own_expenses_or_admin_can_delete_all" 
ON public.expenses 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Update configurations table policies
DROP POLICY IF EXISTS "users_can_view_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_update_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_insert_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_delete_own_configurations" ON public.configurations;

CREATE POLICY "users_can_view_own_configurations_or_admin_can_view_all" 
ON public.configurations 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_update_own_configurations_or_admin_can_update_all" 
ON public.configurations 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_insert_own_configurations" 
ON public.configurations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_configurations_or_admin_can_delete_all" 
ON public.configurations 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

-- Update organization_rules table policies
DROP POLICY IF EXISTS "users_can_view_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_insert_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_update_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_delete_own_organization_rules" ON public.organization_rules;

CREATE POLICY "users_can_view_own_organization_rules_or_admin_can_view_all" 
ON public.organization_rules 
FOR SELECT 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_insert_own_organization_rules" 
ON public.organization_rules 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_organization_rules_or_admin_can_update_all" 
ON public.organization_rules 
FOR UPDATE 
USING (auth.uid() = user_id OR public.is_current_user_admin());

CREATE POLICY "users_can_delete_own_organization_rules_or_admin_can_delete_all" 
ON public.organization_rules 
FOR DELETE 
USING (auth.uid() = user_id OR public.is_current_user_admin());
