"use server";

/**
 * HelpDeX — the AORMS Platform's support-ticket area, nested under SysDeX
 * (same sub-brand pattern as ESTI-inside-AORMS, ConnectDeX-inside-Platform
 * — see docs/esti/AORMS-PLATFORM-ARCHITECTURE.md § Three portals).
 *
 * Explicit scope boundary, disclosed here rather than silently gold-plated:
 * there is no outbound "reply to the submitter" email in this pass — that
 * needs new email infra beyond Supabase Auth's fixed-template emails
 * (invite/recovery), which is all this codebase has. An admin triages and
 * resolves a ticket's status here; actually replying to the submitter by
 * email is manual/out of band for now, same posture as every other
 * disclosed placeholder this session (pricing, onboarding fee amounts).
 */
import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import { getCurrentPlatformSessionAccount } from "../platform/account";
import { createServiceRoleClient as createPlatformServiceRoleClient } from "../platform/service";

export type SupportActionState = { error: string; success?: undefined } | { success: string; error?: undefined } | null;

const CATEGORIES = ["ACCOUNT", "BILLING", "TECHNICAL", "OTHER"] as const;
const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

/**
 * Public — no auth required, same shape as submitConnectDexApplication
 * (lib/actions/connectdex.ts): a support request may come from someone
 * with no Platform account at all. If the caller does happen to have an
 * active Platform session, its account_id is attached so they can later
 * check the ticket's status (RLS: "support_tickets: submitter read own").
 */
export async function submitSupportTicket(_prev: SupportActionState, formData: FormData): Promise<SupportActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const category = String(formData.get("category") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name) return { error: "Enter your name." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) return { error: "Pick a category." };
  if (!subject) return { error: "Enter a subject." };
  if (!message) return { error: "Enter a message." };

  const platform = await createPlatformClient();
  const {
    data: { user },
  } = await platform.auth.getUser();

  const platformService = createPlatformServiceRoleClient();
  const { error } = await platformService.from("support_tickets").insert({
    name,
    email,
    account_id: user?.id ?? null,
    category,
    subject,
    message,
  });
  if (error) return { error: error.message };

  return { success: "Thanks — HelpDeX will review your request and follow up by email." };
}

async function requirePlatformAdmin(): Promise<{ accountId: string } | { error: string }> {
  const account = await getCurrentPlatformSessionAccount();
  if (!account) return { error: "Sign in to the AORMS Platform first." };
  if (!account.is_admin) return { error: "Admin access required." };
  return { accountId: account.id };
}

/** Admin-only: change a ticket's status and/or leave an internal note. */
export async function adminUpdateSupportTicketStatus(
  ticketId: string,
  status: (typeof STATUSES)[number],
  adminNote?: string,
): Promise<{ error?: string }> {
  const gate = await requirePlatformAdmin();
  if ("error" in gate) return gate;
  if (!STATUSES.includes(status)) return { error: "Invalid status." };

  const platformService = createPlatformServiceRoleClient();
  const isResolving = status === "RESOLVED" || status === "CLOSED";
  const { error } = await platformService
    .from("support_tickets")
    .update({
      status,
      admin_note: adminNote?.trim() || null,
      updated_at: new Date().toISOString(),
      ...(isResolving ? { resolved_at: new Date().toISOString(), resolved_by_id: gate.accountId } : {}),
    })
    .eq("id", ticketId);
  if (error) return { error: error.message };

  revalidatePath("/admin/helpdesk");
  return {};
}
