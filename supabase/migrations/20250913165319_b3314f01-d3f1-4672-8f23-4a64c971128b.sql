-- Update the email for the existing user
UPDATE auth.users 
SET email = 'foxastrondigital@gmail.com',
    raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{email}',
      '"foxastrondigital@gmail.com"'::jsonb
    )
WHERE email = 'a@b.com';

-- Also update the email in the public.users table if it exists
UPDATE public.users 
SET email = 'foxastrondigital@gmail.com'
WHERE email = 'a@b.com';