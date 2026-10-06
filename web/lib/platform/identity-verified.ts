import { createServiceRoleClient } from "./service";

/** True once the account has bought the one-time AORMS Identity verification. */
export async function isIdentityVerified(accountId: string): Promise<boolean> {
  const { data } = await createServiceRoleClient().from("identity_licences").select("plan").eq("account_id", accountId).maybeSingle();
  return data?.plan === "AORMS_IDENTITY";
}
