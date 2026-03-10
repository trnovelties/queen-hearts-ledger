
-- Insert default configuration for existing user who doesn't have one
INSERT INTO public.configurations (user_id)
SELECT u.id FROM public.users u
LEFT JOIN public.configurations c ON c.user_id = u.id
WHERE c.id IS NULL;
