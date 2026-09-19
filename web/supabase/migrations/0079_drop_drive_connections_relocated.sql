-- Google Drive connector relocated to aorms-platform, studio_id-keyed
-- (platform/supabase/migrations/0039_drive_connector.sql), per explicit
-- correction: WhatsApp/Drive/AI-agent/DB connector configuration all
-- belong on the identity platform, not the Office Hub — same reasoning
-- already applied to the WhatsApp connector (which never made it past an
-- uncommitted migration) and consistent with tenant_databases' existing
-- studio_id-keyed placement.
--
-- public.documents (file metadata: which project, document type,
-- revision) stays here unchanged — genuinely project-scoped business
-- data, unlike the connection credential itself. Confirmed zero rows in
-- drive_connections before dropping (feature shipped 2026-09-20, no real
-- user had connected yet) — set_updated_at_generic() is kept, still used
-- by documents' own trigger.

drop function if exists public.get_drive_refresh_token(uuid);
drop table if exists public.drive_connections;
