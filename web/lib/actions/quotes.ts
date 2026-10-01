"use server";

/**
 * ConnectDeX quote requests (2026-10-01, roadmap P2 "differentiator #1"): a Studio
 * member asks a supplier Company for a quote on one catalogue product; the
 * Company's owner sees it in /connectdex/quotes and replies there. In-portal only —
 * there is no outbound email yet (no transactional mailer on the Platform), so the
 * Company discovers new requests by visiting the inbox.
 *
 * Inserts go through the service role after validation + rate limiting (the table has
 * no INSERT policy); replying uses the caller's own session so RLS
 * (connectdex.is_company_owner + column-level UPDATE grant on status/reply/replied_at)
 * is the real enforcement.
 */
import { revalidatePath } from "next/cache";
import { createClient as createPlatformClient } from "../platform/server";
import { createServiceRoleClient } from "../platform/service";
import { getCurrentPlatformAccount, getCurrentPlatformSessionAccount } from "../platform/account";
import { checkRateLimitShared, rateLimitIdentifier } from "../security/rate-limit";
import { toSafeErrorMessage } from "../security/safe-error";

export type QuoteActionState = { error: string } | { success: string } | null;

export async function requestQuote(_prev: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const productId = String(formData.get("productId") ?? "");
  const quantity = String(formData.get("quantity") ?? "").trim().slice(0, 120);
  const message = String(formData.get("message") ?? "").trim();
  if (!productId) return { error: "Missing product." };
  if (message.length < 1) return { error: "Tell the supplier what you need." };
  if (message.length > 2000) return { error: "Keep the message under 2,000 characters." };

  const account = (await getCurrentPlatformSessionAccount()) ?? (await getCurrentPlatformAccount());
  if (!account) return { error: "Sign in with your AORMS Identity to request a quote." };

  const limit = await checkRateLimitShared("requestQuote", `${await rateLimitIdentifier()}:${account.id}`, { max: 10, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return { error: `Too many requests — try again in ${Math.ceil(limit.retryAfterSeconds / 60)} min.` };

  const service = createServiceRoleClient();
  const { data: product } = await service.schema("connectdex").from("products").select("id, company_id").eq("id", productId).maybeSingle();
  if (!product) return { error: "That product no longer exists." };

  const { data: membership } = await service
    .from("studio_memberships")
    .select("studio_id")
    .eq("account_id", account.id)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error } = await service.schema("connectdex").from("quote_requests").insert({
    product_id: product.id,
    company_id: product.company_id,
    requester_id: account.id,
    studio_id: membership?.studio_id ?? null,
    quantity: quantity || null,
    message,
  });
  if (error) return { error: toSafeErrorMessage(error) };

  revalidatePath("/connectdex/quotes");
  return { success: "Quote request sent. The supplier will reply in your ConnectDeX quotes inbox." };
}

export async function respondToQuote(_prev: QuoteActionState, formData: FormData): Promise<QuoteActionState> {
  const id = String(formData.get("id") ?? "");
  const reply = String(formData.get("reply") ?? "").trim();
  if (!id) return { error: "Missing request." };
  if (reply.length < 1 || reply.length > 2000) return { error: "Write a reply (up to 2,000 characters)." };

  const platform = await createPlatformClient();
  const { data, error } = await platform
    .schema("connectdex")
    .from("quote_requests")
    .update({ status: "REPLIED", reply, replied_at: new Date().toISOString() })
    .eq("id", id)
    .select("id");
  if (error) return { error: toSafeErrorMessage(error) };
  if (!data || data.length === 0) return { error: "You can only reply to requests for a company you own." };

  revalidatePath("/connectdex/quotes");
  return { success: "Reply sent." };
}

export async function closeQuote(id: string): Promise<{ error?: string }> {
  const platform = await createPlatformClient();
  const { data, error } = await platform.schema("connectdex").from("quote_requests").update({ status: "CLOSED" }).eq("id", id).select("id");
  if (error) return { error: toSafeErrorMessage(error) };
  if (!data || data.length === 0) return { error: "You can only close requests for a company you own." };
  revalidatePath("/connectdex/quotes");
  return {};
}
