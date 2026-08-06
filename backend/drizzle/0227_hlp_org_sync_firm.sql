-- Panel → hub sync: stable UUID firm scope per licensing org + device sync bearer hash.
-- Enables firmFromSyncToken via hlp_device (alongside legacy esti_license_install).

ALTER TABLE hlp_organization
  ADD COLUMN IF NOT EXISTS sync_firm_id uuid;

UPDATE hlp_organization
SET sync_firm_id = gen_random_uuid()
WHERE sync_firm_id IS NULL;

ALTER TABLE hlp_organization
  ALTER COLUMN sync_firm_id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN sync_firm_id SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hlp_organization_sync_firm_id_idx
  ON hlp_organization (sync_firm_id);
