-- Links a local profile to a portable AORMS Platform identity (see the
-- separate platform/supabase/ project + docs/esti/AORMS-IDENTITY.md). Not
-- a live foreign key -- it points across Supabase projects, so a real FK
-- is impossible; this stores the linked person's AORMS-U- handle as a
-- plain, app-verified value instead (the AORMS Platform plan's
-- linkPlatformIdentity() Server Action verifies the handle actually exists
-- on the platform project via its service-role client before writing it
-- here). No RLS change needed -- the existing "profiles: read own"/
-- "profiles: staff read all"/"profiles: owner manages" policies
-- (migration 0001) already cover this column since they're row-scoped,
-- not column-scoped.
alter table public.profiles
  add column platform_public_id text unique;
