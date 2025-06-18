
-- Create a function to check if the current user is an admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- Create admin-specific RLS policies for all tables to allow admins to view any organization's data

-- Update games table policies
DROP POLICY IF EXISTS "admins_can_view_all_games" ON public.games;
CREATE POLICY "admins_can_view_all_games" 
ON public.games 
FOR SELECT 
USING (public.is_current_user_admin());

-- Update weeks table policies  
DROP POLICY IF EXISTS "admins_can_view_all_weeks" ON public.weeks;
CREATE POLICY "admins_can_view_all_weeks" 
ON public.weeks 
FOR SELECT 
USING (public.is_current_user_admin());

-- Update ticket_sales table policies
DROP POLICY IF EXISTS "admins_can_view_all_ticket_sales" ON public.ticket_sales;
CREATE POLICY "admins_can_view_all_ticket_sales" 
ON public.ticket_sales 
FOR SELECT 
USING (public.is_current_user_admin());

-- Update expenses table policies
DROP POLICY IF EXISTS "admins_can_view_all_expenses" ON public.expenses;
CREATE POLICY "admins_can_view_all_expenses" 
ON public.expenses 
FOR SELECT 
USING (public.is_current_user_admin());

-- Update configurations table policies
DROP POLICY IF EXISTS "admins_can_view_all_configurations" ON public.configurations;
CREATE POLICY "admins_can_view_all_configurations" 
ON public.configurations 
FOR SELECT 
USING (public.is_current_user_admin());

-- Update organization_rules table policies
DROP POLICY IF EXISTS "admins_can_view_all_organization_rules" ON public.organization_rules;
CREATE POLICY "admins_can_view_all_organization_rules" 
ON public.organization_rules 
FOR SELECT 
USING (public.is_current_user_admin());

-- Create a function to get organization data for admins
CREATE OR REPLACE FUNCTION public.get_organization_data(target_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  email text,
  organization_name text,
  logo_url text,
  about text,
  role text
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT u.id, u.email, u.organization_name, u.logo_url, u.about, u.role
  FROM public.users u
  WHERE u.id = target_user_id
  AND public.is_current_user_admin();
$$;
