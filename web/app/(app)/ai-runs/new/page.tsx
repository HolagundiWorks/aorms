import { Column, Grid, InlineNotification } from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewAiDraftForm } from "../../../../components/aorms/esti/NewAiDraftForm";
import { PageHeader } from "../../../../components/aorms/PageHeader";

const WRITE_TIER_ROLES = new Set(["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE"]);

/**
 * AI Studio — new draft. The write-gate check here is UX only (a clear
 * message instead of a silent no-op) — generateAiDraft() re-checks the
 * same role tier server-side, since this page-level check can't stop a
 * direct form POST.
 */
export default async function NewAiDraftPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: projects }] = await Promise.all([
    user ? supabase.from("profiles").select("role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("project_offices").select("id, ref, title").is("archived_at", null).order("ref", { ascending: false }).limit(200),
  ]);

  const canDraft = !!profile && WRITE_TIER_ROLES.has(profile.role);

  return (
    <Grid>
      <Column sm={4} md={8} lg={12}>
        <PageHeader
          title="New AI Draft"
          description="ESTI drafts a document from live project context. Every draft starts as a review-required record — nothing is issued automatically."
        />

        {!canDraft ? (
          <InlineNotification
            kind="info"
            title="Write access needed"
            subtitle="Document drafts need Associate role and above — ask an owner/partner, or use Ask ESTI (header) for questions instead."
            hideCloseButton
            lowContrast
          />
        ) : (
          <NewAiDraftForm projects={projects ?? []} />
        )}
      </Column>
    </Grid>
  );
}
