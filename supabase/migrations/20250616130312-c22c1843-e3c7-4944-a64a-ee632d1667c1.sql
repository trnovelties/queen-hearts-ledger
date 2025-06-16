
-- First, let's check and fix the RLS policies on the users table
-- Drop any existing problematic policies on users table
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users based on email" ON public.users;

-- Create a security definer function to get current user data safely
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT auth.uid();
$$;

-- Create proper RLS policies for users table without recursion
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (id = get_current_user_id());

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (id = get_current_user_id());

-- Also create RLS policies for configurations table if they don't exist
ALTER TABLE public.configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view configurations" 
ON public.configurations 
FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can update configurations" 
ON public.configurations 
FOR UPDATE 
TO authenticated 
USING (true);

CREATE POLICY "Authenticated users can insert configurations" 
ON public.configurations 
FOR INSERT 
TO authenticated 
WITH CHECK (true);
