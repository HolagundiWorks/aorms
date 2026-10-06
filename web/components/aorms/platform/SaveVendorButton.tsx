import { Button } from "@carbon/react";
import { toggleSavedVendor } from "../../../lib/actions/saved-vendors";

/** Save / unsave a supplier Company (server-action form — works without client JS). */
export function SaveVendorButton({ companyId, saved }: { companyId: string; saved: boolean }) {
  return (
    <form action={toggleSavedVendor}>
      <input type="hidden" name="companyId" value={companyId} />
      <Button type="submit" kind="ghost" size="sm">
        {saved ? "Saved ✓" : "Save vendor"}
      </Button>
    </form>
  );
}
