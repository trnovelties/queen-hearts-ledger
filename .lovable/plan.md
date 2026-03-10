

# Fix: Login fails after signup - "Invalid login credentials"

## Root Cause

The `generate-invite-link` edge function was called during testing, which pre-created the user in `auth.users` via `admin.generateLink({ type: 'invite' })`. When the organization then visited the signup page and called `supabase.auth.signUp()`, Supabase detected the existing user and did an "immediate login after signup" -- but the password typed on the signup form was **never actually saved**. This is why login fails afterward.

The auth logs confirm this sequence:
1. `user_invited` → user pre-created in auth by edge function
2. `signUp()` → returned 200 with `immediate_login_after_signup: true` (did NOT set password)
3. Login → `400: Invalid login credentials`

## The Fix

**1. Remove the unused edge function** -- The current `InviteOrganization` component already generates the signup URL client-side without calling the edge function. The edge function is leftover code that causes confusion and was the source of this bug.

**2. Delete the test user** -- The user `samnahid3@gmail.com` (and any other test users created via the old invite flow) need to be deleted from the Supabase Auth dashboard. They can then re-sign up cleanly through the `/signup/email` route.

**3. Ensure email confirmation is handled** -- Verify that Supabase Auth settings have "Confirm email" disabled (or that the signup page handles the confirmation flow), otherwise new signups won't be able to log in until they confirm via email.

## Changes

| What | Action |
|------|--------|
| `supabase/functions/generate-invite-link/index.ts` | Delete (no longer used) |
| Test users in Supabase Auth | Delete from dashboard, re-test signup flow |
| Email confirmation setting | Verify in Supabase Auth settings |

## Manual Steps Required

After implementation, you'll need to:
1. Go to **Supabase Dashboard > Authentication > Users** and delete `samnahid3@gmail.com` (user_id: `d78a1573-...`)
2. Go to **Supabase Dashboard > Authentication > Providers > Email** and verify "Confirm email" is **disabled** (or handle confirmation in the app)
3. Re-test: generate a new signup link from admin panel, visit it, create account, then log in

