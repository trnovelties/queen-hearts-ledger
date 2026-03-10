

# Fix: Auto-populate new users in the `users` table

## The Problem

The function `handle_new_user()` exists in your database, but the **trigger** that fires it when a new user signs up is missing. So when you create a user in the Supabase dashboard, no row gets inserted into `public.users`.

## The Fix

Run a single migration to create the trigger on `auth.users`:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

This will ensure that every new user created (via Supabase dashboard or signup) automatically gets a row in `public.users` with the `organizer` role.

## After the migration

For the user you already created, we'll need to manually insert their row into `public.users` since the trigger wasn't there when they were created.

