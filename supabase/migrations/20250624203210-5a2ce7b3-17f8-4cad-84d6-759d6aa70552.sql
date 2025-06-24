
-- Drop all existing policies first to remove dependencies
-- GAMES TABLE
DROP POLICY IF EXISTS "games_select_policy" ON public.games;
DROP POLICY IF EXISTS "games_insert_policy" ON public.games;
DROP POLICY IF EXISTS "games_update_policy" ON public.games;
DROP POLICY IF EXISTS "games_delete_policy" ON public.games;
DROP POLICY IF EXISTS "users_can_view_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_view_own_games_or_admin_can_view_all" ON public.games;
DROP POLICY IF EXISTS "users_can_insert_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_update_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_update_own_games_or_admin_can_update_all" ON public.games;
DROP POLICY IF EXISTS "users_can_delete_own_games" ON public.games;
DROP POLICY IF EXISTS "users_can_delete_own_games_or_admin_can_delete_all" ON public.games;
DROP POLICY IF EXISTS "admins_can_view_all_games" ON public.games;

-- WEEKS TABLE
DROP POLICY IF EXISTS "weeks_select_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_insert_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_update_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_delete_policy" ON public.weeks;
DROP POLICY IF EXISTS "users_can_view_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_view_own_weeks_or_admin_can_view_all" ON public.weeks;
DROP POLICY IF EXISTS "users_can_insert_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_update_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_update_own_weeks_or_admin_can_update_all" ON public.weeks;
DROP POLICY IF EXISTS "users_can_delete_own_weeks" ON public.weeks;
DROP POLICY IF EXISTS "users_can_delete_own_weeks_or_admin_can_delete_all" ON public.weeks;
DROP POLICY IF EXISTS "admins_can_view_all_weeks" ON public.weeks;

-- TICKET_SALES TABLE
DROP POLICY IF EXISTS "ticket_sales_select_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_insert_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_update_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_delete_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_view_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_view_own_ticket_sales_or_admin_can_view_all" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_insert_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_update_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_update_own_ticket_sales_or_admin_can_update_all" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_delete_own_ticket_sales" ON public.ticket_sales;
DROP POLICY IF EXISTS "users_can_delete_own_ticket_sales_or_admin_can_delete_all" ON public.ticket_sales;
DROP POLICY IF EXISTS "admins_can_view_all_ticket_sales" ON public.ticket_sales;

-- EXPENSES TABLE
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;
DROP POLICY IF EXISTS "users_can_view_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_view_own_expenses_or_admin_can_view_all" ON public.expenses;
DROP POLICY IF EXISTS "users_can_insert_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_update_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_update_own_expenses_or_admin_can_update_all" ON public.expenses;
DROP POLICY IF EXISTS "users_can_delete_own_expenses" ON public.expenses;
DROP POLICY IF EXISTS "users_can_delete_own_expenses_or_admin_can_delete_all" ON public.expenses;
DROP POLICY IF EXISTS "admins_can_view_all_expenses" ON public.expenses;

-- CONFIGURATIONS TABLE
DROP POLICY IF EXISTS "configurations_select_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_insert_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_update_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_delete_policy" ON public.configurations;
DROP POLICY IF EXISTS "users_can_view_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_view_own_configurations_or_admin_can_view_all" ON public.configurations;
DROP POLICY IF EXISTS "users_can_update_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_update_own_configurations_or_admin_can_update_all" ON public.configurations;
DROP POLICY IF EXISTS "users_can_insert_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_delete_own_configurations" ON public.configurations;
DROP POLICY IF EXISTS "users_can_delete_own_configurations_or_admin_can_delete_all" ON public.configurations;
DROP POLICY IF EXISTS "admins_can_view_all_configurations" ON public.configurations;

-- ORGANIZATION_RULES TABLE
DROP POLICY IF EXISTS "organization_rules_select_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_insert_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_update_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_delete_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_view_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_view_own_organization_rules_or_admin_can_view_all" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_insert_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_update_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_update_own_organization_rules_or_admin_can_update_all" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_delete_own_organization_rules" ON public.organization_rules;
DROP POLICY IF EXISTS "users_can_delete_own_organization_rules_or_admin_can_delete_all" ON public.organization_rules;
DROP POLICY IF EXISTS "admins_can_view_all_organization_rules" ON public.organization_rules;

-- USERS TABLE
DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.users;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.users;
DROP POLICY IF EXISTS "admins_can_view_all_users" ON public.users;
DROP POLICY IF EXISTS "admins_can_update_all_users" ON public.users;

-- Now drop and recreate the function
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Now recreate all policies with the corrected function

-- GAMES TABLE
CREATE POLICY "games_select_policy" ON public.games
FOR SELECT USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "games_insert_policy" ON public.games
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "games_update_policy" ON public.games
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "games_delete_policy" ON public.games
FOR DELETE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- WEEKS TABLE
CREATE POLICY "weeks_select_policy" ON public.weeks
FOR SELECT USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "weeks_insert_policy" ON public.weeks
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "weeks_update_policy" ON public.weeks
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "weeks_delete_policy" ON public.weeks
FOR DELETE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- TICKET_SALES TABLE
CREATE POLICY "ticket_sales_select_policy" ON public.ticket_sales
FOR SELECT USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "ticket_sales_insert_policy" ON public.ticket_sales
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "ticket_sales_update_policy" ON public.ticket_sales
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "ticket_sales_delete_policy" ON public.ticket_sales
FOR DELETE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- EXPENSES TABLE
CREATE POLICY "expenses_select_policy" ON public.expenses
FOR SELECT USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "expenses_insert_policy" ON public.expenses
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "expenses_update_policy" ON public.expenses
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "expenses_delete_policy" ON public.expenses
FOR DELETE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- CONFIGURATIONS TABLE
CREATE POLICY "configurations_select_policy" ON public.configurations
FOR SELECT USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "configurations_insert_policy" ON public.configurations
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "configurations_update_policy" ON public.configurations
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "configurations_delete_policy" ON public.configurations
FOR DELETE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- ORGANIZATION_RULES TABLE
CREATE POLICY "organization_rules_select_policy" ON public.organization_rules
FOR SELECT USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "organization_rules_insert_policy" ON public.organization_rules
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "organization_rules_update_policy" ON public.organization_rules
FOR UPDATE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

CREATE POLICY "organization_rules_delete_policy" ON public.organization_rules
FOR DELETE USING (
  auth.uid() = user_id OR public.is_current_user_admin()
);

-- USERS TABLE
CREATE POLICY "users_select_policy" ON public.users
FOR SELECT USING (
  auth.uid() = id OR public.is_current_user_admin()
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE USING (
  auth.uid() = id OR public.is_current_user_admin()
);

CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE USING (
  public.is_current_user_admin()
);
