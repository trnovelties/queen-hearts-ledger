
-- Fix the infinite recursion in RLS policies by updating the users table policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Recreate the policies with a simpler approach that won't cause recursion
CREATE POLICY "Users can view their own profile" 
ON public.users 
FOR SELECT 
USING (id = auth.uid());

CREATE POLICY "Users can update their own profile" 
ON public.users 
FOR UPDATE 
USING (id = auth.uid());

-- Ensure the configurations table has proper RLS policies without recursion
DROP POLICY IF EXISTS "Authenticated users can view configurations" ON public.configurations;
DROP POLICY IF EXISTS "Authenticated users can update configurations" ON public.configurations;
DROP POLICY IF EXISTS "Authenticated users can insert configurations" ON public.configurations;

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
