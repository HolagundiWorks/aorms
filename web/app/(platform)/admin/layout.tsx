import { redirect } from "next/navigation";
import { createClient as createPlatformClient } from "../../../lib/platform/server";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../../../lib/platform/service";
import { sessionIsAal2, staffMfaRequired } from "../../../lib/platform/mfa";

/**
 * SysDeX shell guard (2026-10-01 audit R3): when STAFF_MFA_REQUIRED=true, a staff
 * member whose session hasn't completed MFA is sent to /platform-mfa before any
 * /admin/* page renders. (The real enforcement is in getCurrentPlatformSessionAccount,
 * which also covers Server Actions — this redirect just gives a clear path.)
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (staffMfaRequired()) {
    const platform = await createPlatformClient();
    const {
      data: { user },
    } = await platform.auth.getUser();
    if (user) {
      const { data: staff } = await createPlatformServiceRoleClient().from("platform_staff").select("id").eq("id", user.id).maybeSingle();
      if (staff && !(await sessionIsAal2())) redirect("/platform-mfa");
    }
  }
  return children;
}
