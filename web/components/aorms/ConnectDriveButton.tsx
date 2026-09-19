import { Button } from "@carbon/react";
import { startDriveConnection } from "../../lib/actions/drive";

/**
 * Starts the Google Drive OAuth flow (docs/esti/AORMS-V2-DEVELOPER-
 * GUIDELINES.md § 6). Plain server-rendered form, no client state needed
 * — startDriveConnection() always redirects (to Google's consent screen,
 * or back to /firm-settings with a drive_error on an early failure).
 */
export function ConnectDriveButton() {
  return (
    <form action={startDriveConnection}>
      <Button type="submit">Connect Google Drive</Button>
    </form>
  );
}
