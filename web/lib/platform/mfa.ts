import { createClient as createPlatformClient } from "./server";

/**
 * Staff MFA (2026-10-01 audit R3). When `STAFF_MFA_REQUIRED=true`, a platform-staff
 * session only counts as staff once it has reached AAL2 (a TOTP code verified in this
 * session). Off by default on purpose: enforcing it before the staff member has
 * enrolled a factor would lock them out of SysDeX — enrol first at /platform-mfa,
 * confirm it works, then set the variable.
 */
export function staffMfaRequired(): boolean {
  return process.env.STAFF_MFA_REQUIRED === "true";
}

/** True when the current Platform session has completed MFA (AAL2). */
export async function sessionIsAal2(): Promise<boolean> {
  const platform = await createPlatformClient();
  const { data } = await platform.auth.mfa.getAuthenticatorAssuranceLevel();
  return data?.currentLevel === "aal2";
}
