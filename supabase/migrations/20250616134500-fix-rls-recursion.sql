
-- Complete fix for infinite recursion in RLS policies
-- Remove all existing problematic policies and functions

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- Drop all existing policies on configurations table
DROP POLICY IF EXISTS "Authenticated users can view configurations" ON public.configurations;
DROP POLICY IF EXISTS "Authenticated users can update configurations" ON public.configurations;
DROP POLICY IF EXISTS "Authenticated users can insert configurations" ON public.configurations;

-- Drop the problematic function that might be causing recursion
DROP FUNCTION IF EXISTS public.get_current_user_id();

-- Disable RLS temporarily to avoid issues
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for users table
CREATE POLICY "users_select_own" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "users_update_own" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Create simple policies for configurations table that don't reference users
CREATE POLICY "configurations_select_authenticated" 
ON public.configurations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "configurations_update_authenticated" 
ON public.configurations 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "configurations_insert_authenticated" 
ON public.configurations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "configurations_delete_authenticated" 
ON public.configurations 
FOR DELETE 
TO authenticated 
USING (true);
