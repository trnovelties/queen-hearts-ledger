
-- Fix RLS policies to be more secure - admins can view all data, but regular users can only see their own

-- Drop existing policies (including the ones we're about to recreate)
DROP POLICY IF EXISTS "games_select_policy" ON public.games;
DROP POLICY IF EXISTS "games_user_select_own" ON public.games;
DROP POLICY IF EXISTS "games_admin_select_all" ON public.games;
DROP POLICY IF EXISTS "games_insert_policy" ON public.games;
DROP POLICY IF EXISTS "games_update_policy" ON public.games;
DROP POLICY IF EXISTS "games_delete_policy" ON public.games;

DROP POLICY IF EXISTS "weeks_select_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_user_select_own" ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_select_all" ON public.weeks;
DROP POLICY IF EXISTS "weeks_insert_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_update_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_delete_policy" ON public.weeks;

DROP POLICY IF EXISTS "ticket_sales_select_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_user_select_own" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_admin_select_all" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_insert_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_update_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_delete_policy" ON public.ticket_sales;

DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_user_select_own" ON public.expenses;
DROP POLICY IF EXISTS "expenses_admin_select_all" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

DROP POLICY IF EXISTS "configurations_select_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_user_select_own" ON public.configurations;
DROP POLICY IF EXISTS "configurations_admin_select_all" ON public.configurations;
DROP POLICY IF EXISTS "configurations_insert_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_update_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_delete_policy" ON public.configurations;

DROP POLICY IF EXISTS "organization_rules_select_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_user_select_own" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_admin_select_all" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_insert_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_update_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_delete_policy" ON public.organization_rules;

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_user_select_own" ON public.users;
DROP POLICY IF EXISTS "users_admin_select_all" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- Create secure policies that properly separate admin and user access

-- GAMES TABLE - Secure policies
CREATE POLICY "games_user_select_own" ON public.games
FOR SELECT USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "games_admin_select_all" ON public.games
FOR SELECT USING (
  public.is_current_user_admin()
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

-- WEEKS TABLE - Secure policies  
CREATE POLICY "weeks_user_select_own" ON public.weeks
FOR SELECT USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "weeks_admin_select_all" ON public.weeks
FOR SELECT USING (
  public.is_current_user_admin()
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

-- TICKET_SALES TABLE - Secure policies
CREATE POLICY "ticket_sales_user_select_own" ON public.ticket_sales
FOR SELECT USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "ticket_sales_admin_select_all" ON public.ticket_sales
FOR SELECT USING (
  public.is_current_user_admin()
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

-- EXPENSES TABLE - Secure policies
CREATE POLICY "expenses_user_select_own" ON public.expenses
FOR SELECT USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "expenses_admin_select_all" ON public.expenses
FOR SELECT USING (
  public.is_current_user_admin()
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

-- CONFIGURATIONS TABLE - Secure policies
CREATE POLICY "configurations_user_select_own" ON public.configurations
FOR SELECT USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "configurations_admin_select_all" ON public.configurations
FOR SELECT USING (
  public.is_current_user_admin()
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

-- ORGANIZATION_RULES TABLE - Secure policies
CREATE POLICY "organization_rules_user_select_own" ON public.organization_rules
FOR SELECT USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "organization_rules_admin_select_all" ON public.organization_rules
FOR SELECT USING (
  public.is_current_user_admin()
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

-- USERS TABLE - Secure policies
CREATE POLICY "users_user_select_own" ON public.users
FOR SELECT USING (
  auth.uid() = id AND NOT public.is_current_user_admin()
);

CREATE POLICY "users_admin_select_all" ON public.users
FOR SELECT USING (
  public.is_current_user_admin()
);

CREATE POLICY "users_update_policy" ON public.users
FOR UPDATE USING (
  auth.uid() = id OR public.is_current_user_admin()
);

CREATE POLICY "users_delete_policy" ON public.users
FOR DELETE USING (
  public.is_current_user_admin()
);
