
-- Complete cleanup of all problematic RLS policies that cause infinite recursion

-- First, drop ALL existing policies on users table to start fresh
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
DROP POLICY IF EXISTS "Admins can update users" ON public.users;

-- Drop ALL existing policies on configurations table
DROP POLICY IF EXISTS "Authenticated users can view configurations" ON public.configurations;
DROP POLICY IF EXISTS "Authenticated users can update configurations" ON public.configurations;
DROP POLICY IF EXISTS "Authenticated users can insert configurations" ON public.configurations;
DROP POLICY IF EXISTS "Authenticated users can delete configurations" ON public.configurations;
DROP POLICY IF EXISTS "configurations_select_authenticated" ON public.configurations;
DROP POLICY IF EXISTS "configurations_update_authenticated" ON public.configurations;
DROP POLICY IF EXISTS "configurations_insert_authenticated" ON public.configurations;
DROP POLICY IF EXISTS "configurations_delete_authenticated" ON public.configurations;
DROP POLICY IF EXISTS "Admins can update configurations" ON public.configurations;

-- Drop any problematic security definer functions
DROP FUNCTION IF EXISTS public.get_current_user_id();

-- Disable RLS temporarily to clean up
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for users table
CREATE POLICY "users_select_policy" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "users_update_policy" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Create simple policies for configurations table (no role checking needed)
CREATE POLICY "config_select_policy" 
ON public.configurations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "config_update_policy" 
ON public.configurations 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "config_insert_policy" 
ON public.configurations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "config_delete_policy" 
ON public.configurations 
FOR DELETE 
TO authenticated 
USING (true);
