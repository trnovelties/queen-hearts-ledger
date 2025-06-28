
-- Add proper RLS policies for configurations table to ensure user-specific access
-- First, drop any existing conflicting policies
DROP POLICY IF EXISTS "configurations_user_select_own" ON public.configurations;
DROP POLICY IF EXISTS "configurations_admin_select_all" ON public.configurations;
DROP POLICY IF EXISTS "configurations_user_update_own" ON public.configurations;
DROP POLICY IF EXISTS "configurations_admin_update_all" ON public.configurations;
DROP POLICY IF EXISTS "configurations_user_insert_own" ON public.configurations;
DROP POLICY IF EXISTS "configurations_admin_insert_all" ON public.configurations;
DROP POLICY IF EXISTS "configurations_user_delete_own" ON public.configurations;
DROP POLICY IF EXISTS "configurations_admin_delete_all" ON public.configurations;

-- Create secure RLS policies for configurations table
CREATE POLICY "configurations_user_select_own" ON public.configurations
FOR SELECT USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "configurations_admin_select_all" ON public.configurations
FOR SELECT USING (
  public.is_current_user_admin()
);

CREATE POLICY "configurations_user_insert_own" ON public.configurations
FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

CREATE POLICY "configurations_user_update_own" ON public.configurations
FOR UPDATE USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "configurations_admin_update_all" ON public.configurations
FOR UPDATE USING (
  public.is_current_user_admin()
);

CREATE POLICY "configurations_user_delete_own" ON public.configurations
FOR DELETE USING (
  auth.uid() = user_id AND NOT public.is_current_user_admin()
);

CREATE POLICY "configurations_admin_delete_all" ON public.configurations
FOR DELETE USING (
  public.is_current_user_admin()
);

-- Ensure all existing configurations have proper user_id set
-- This will set user_id for any configurations that don't have it set
UPDATE public.configurations 
SET user_id = (
  SELECT id FROM public.users WHERE role != 'admin' LIMIT 1
) 
WHERE user_id IS NULL;
