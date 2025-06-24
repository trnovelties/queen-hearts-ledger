
-- Fix all functions to have secure search paths and proper security

-- 1. Fix is_current_user_admin function
DROP FUNCTION IF EXISTS public.is_current_user_admin() CASCADE;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2. Fix get_organization_data function
DROP FUNCTION IF EXISTS public.get_organization_data(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_organization_data(target_user_id uuid)
RETURNS TABLE(user_id uuid, email text, organization_name text, logo_url text, about text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.id, u.email, u.organization_name, u.logo_url, u.about, u.role
  FROM public.users u
  WHERE u.id = target_user_id
  AND public.is_current_user_admin();
$$;

-- 3. Fix calculate_displayed_jackpot function
DROP FUNCTION IF EXISTS public.calculate_displayed_jackpot(numeric, numeric, numeric) CASCADE;

CREATE OR REPLACE FUNCTION public.calculate_displayed_jackpot(contributions_total numeric, minimum_jackpot numeric, carryover_jackpot numeric DEFAULT 0)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- If contributions haven't reached minimum, show minimum + carryover
  IF contributions_total < minimum_jackpot THEN
    RETURN minimum_jackpot + carryover_jackpot;
  ELSE
    -- Once threshold is met, show contributions + carryover
    RETURN contributions_total + carryover_jackpot;
  END IF;
END;
$$;

-- 4. Fix increment_configuration_version function
DROP FUNCTION IF EXISTS public.increment_configuration_version() CASCADE;

CREATE OR REPLACE FUNCTION public.increment_configuration_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.version = COALESCE(OLD.version, 0) + 1;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. Fix get_user_profile function
DROP FUNCTION IF EXISTS public.get_user_profile(uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid)
RETURNS SETOF users
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.users WHERE id = user_id;
$$;

-- 6. Fix handle_new_user function
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'organizer');
  RETURN new;
END;
$$;

-- 7. Fix update_user_profile function
DROP FUNCTION IF EXISTS public.update_user_profile(uuid, text, text, text) CASCADE;

CREATE OR REPLACE FUNCTION public.update_user_profile(p_user_id uuid, p_organization_name text, p_about text, p_logo_url text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.users
  SET 
    organization_name = p_organization_name,
    about = p_about,
    logo_url = p_logo_url,
    created_at = COALESCE(created_at, NOW())
  WHERE id = p_user_id;
END;
$$;

-- Now recreate all RLS policies to ensure they work with the fixed functions
-- Drop all policies first
DROP POLICY IF EXISTS "games_select_policy" ON public.games;
DROP POLICY IF EXISTS "games_insert_policy" ON public.games;
DROP POLICY IF EXISTS "games_update_policy" ON public.games;
DROP POLICY IF EXISTS "games_delete_policy" ON public.games;

DROP POLICY IF EXISTS "weeks_select_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_insert_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_update_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_delete_policy" ON public.weeks;

DROP POLICY IF EXISTS "ticket_sales_select_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_insert_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_update_policy" ON public.ticket_sales;
DROP POLICY IF EXISTS "ticket_sales_delete_policy" ON public.ticket_sales;

DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

DROP POLICY IF EXISTS "configurations_select_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_insert_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_update_policy" ON public.configurations;
DROP POLICY IF EXISTS "configurations_delete_policy" ON public.configurations;

DROP POLICY IF EXISTS "organization_rules_select_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_insert_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_update_policy" ON public.organization_rules;
DROP POLICY IF EXISTS "organization_rules_delete_policy" ON public.organization_rules;

DROP POLICY IF EXISTS "users_select_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- Recreate all policies with the fixed function
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
