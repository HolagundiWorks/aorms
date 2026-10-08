/**
 * Email notifications for the Contractor Portal. Best-effort and silent on failure (mail may be unconfigured —
 * `sendEmail` reports that rather than throwing). Studio recipients are the firm's owners and partners; the contractor is
 * emailed at its record's address. Addresses are read with the service-role client, never exposed to the page.
 */
import { createServiceRoleClient } from "../supabase/service";
import { sendEmail } from "../email/send";

export async function notifyStudio(
  firmId: string | null,
  subject: string,
  text: string,
): Promise<void> {
  if (!firmId) return;
  try {
    const admin = createServiceRoleClient();
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("firm_id", firmId)
      .in("role", ["OWNER", "PARTNER"])
      .limit(5);
    for (const r of data ?? []) {
      const { data: u } = await admin.auth.admin.getUserById(r.id);
      if (u?.user?.email) await sendEmail({ to: u.user.email, subject, text });
    }
  } catch {
    // Notifications are best-effort: never fail the contractor's submission over mail or key problems.
  }
}

export async function notifyContractor(
  contractorId: string,
  subject: string,
  text: string,
): Promise<void> {
  try {
    const { data } = await createServiceRoleClient()
      .from("contractors")
      .select("email")
      .eq("id", contractorId)
      .maybeSingle();
    if (data?.email) await sendEmail({ to: data.email, subject, text });
  } catch {
    // best-effort, as above
  }
}
