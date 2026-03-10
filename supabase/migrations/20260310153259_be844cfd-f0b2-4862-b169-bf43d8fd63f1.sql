
-- Update handle_new_user to also create a default configurations row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.users (id, email, role)
  VALUES (new.id, new.email, 'organizer');
  
  -- Create default configuration for the new user
  INSERT INTO public.configurations (user_id)
  VALUES (new.id);
  
  RETURN new;
END;
$$;
