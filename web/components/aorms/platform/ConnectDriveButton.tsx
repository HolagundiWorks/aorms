import { Button } from "@carbon/react";
import { startDriveConnection } from "../../../lib/actions/drive";

/**
 * Starts the Google Drive OAuth flow (docs/esti/AORMS-V2-DEVELOPER-
 * GUIDELINES.md § 6), bound to one Studio — moved here from
 * components/aorms/ConnectDriveButton.tsx 2026-09-20 when the connector
 * relocated from the Office Hub to the AORMS Platform. Plain server-
 * rendered form, no client state needed — startDriveConnection() always
 * redirects (to Google's consent screen, or back to this Studio page
 * with a drive_error on an early failure).
 */
export function ConnectDriveButton({ studioId }: { studioId: string }) {
  return (
    <form action={startDriveConnection.bind(null, studioId)}>
      <Button type="submit" size="sm">
        Connect Google Drive
      </Button>
    </form>
  );
}
