# Supabase migrations

Apply `migrations/202609030001_secure_task_platform.sql` in the Supabase SQL Editor
or through the Supabase CLI while authenticated as the project owner. It creates or
aligns the core tables, creates a profile-on-signup trigger, enables RLS, and makes
all balance and review writes pass through security-definer RPCs.

The migration assumes the existing frontend's numeric task and submission IDs. Test
it on a Supabase branch or staging project before applying it to production. Do not
put a service-role key in the frontend.
