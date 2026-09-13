import Link from "next/link";
import { Tag, Tile } from "@carbon/react";
import type { PriorityItem } from "../../../lib/dashboard/priority";
import { AcceptDecisionButton, ApproveButton, MarkTaskDoneButton } from "./QueueActions";

const KIND_LABEL: Record<PriorityItem["kind"], string> = {
  TASK: "Task",
  APPROVAL: "Approval",
  CLIENT_REQUEST: "Client request",
  CONSULTANT_REQUEST: "Consultant request",
  DECISION: "Decision",
};

const KIND_TAG: Record<PriorityItem["kind"], "red" | "purple" | "blue" | "teal" | "magenta"> = {
  TASK: "red",
  APPROVAL: "purple",
  CLIENT_REQUEST: "blue",
  CONSULTANT_REQUEST: "teal",
  DECISION: "magenta",
};

// Only TASK/DECISION's ageDays actually means "overdue against a
// deadline" (priority.ts computes it from due_date/review_deadline for
// those two) — APPROVAL/CLIENT_REQUEST/CONSULTANT_REQUEST's ageDays is
// "days since sent/opened," which is aging, not lateness. Styled and
// worded differently so the queue doesn't claim more urgency than the
// data actually supports.
const OVERDUE_KINDS: PriorityItem["kind"][] = ["TASK", "DECISION"];

function QuickAction({ item }: { item: PriorityItem }) {
  switch (item.kind) {
    case "TASK":
      return <MarkTaskDoneButton taskId={item.id} />;
    case "APPROVAL":
      return <ApproveButton approvalId={item.id} />;
    case "DECISION":
      // projectId is only ever null here if the decision's own project
      // was deleted between the query and render — practically never,
      // but the type is nullable so this guards it rather than asserting.
      return item.projectId ? <AcceptDecisionButton projectId={item.projectId} decisionId={item.id} /> : null;
    default:
      // CLIENT_REQUEST / CONSULTANT_REQUEST — see QueueActions.tsx's own
      // header comment for why these two stay link-only.
      return null;
  }
}

/**
 * The dashboard's Action Queue (2026-09-13 restructure) — replaces the
 * old "Top 3 Priorities" card grid (TopPriorities.tsx, view-only, 3
 * items) with a denser, wider, genuinely actionable list: still the same
 * ranked pool from lib/dashboard/priority.ts (now also pooling in
 * decisions awaiting client review, not just tasks/approvals/requests),
 * but showing more of it (the page passes n=8) and putting a real
 * one-click resolution inline wherever one honestly exists — the point
 * of "suggest what to do next" is defeated if doing it still means
 * navigating away and finding the same row again on another page.
 */
export function ActionQueue({ items }: { items: PriorityItem[] }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <h2 className="cds--type-heading-02" style={{ marginBottom: "0.5rem" }}>
        Next up
      </h2>
      {/* Bounded height + its own internal scroll, not the page — same
          "content scrolls inside its own Tile" pattern DashboardTabs.tsx
          now also uses (2026-09-13 "single screen" request); see that
          file's own comment for the precedent (StudioAbstract.tsx's
          DataTable). 8 rows at this row height comfortably clears 24rem
          without scrolling on a normal viewport — the cap only kicks in
          if the ranked pool is ever asked for more than that. */}
      <Tile style={{ maxHeight: "18rem", overflowY: "auto" }}>
        {items.length === 0 ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            Nothing urgent stands out today.
          </p>
        ) : (
          items.map((item, i) => {
            const isOverdueKind = OVERDUE_KINDS.includes(item.kind);
            return (
              <div
                key={`${item.kind}:${item.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "1rem",
                  padding: "0.75rem 0",
                  borderBottom: i === items.length - 1 ? "none" : "1px solid var(--cds-border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: 0 }}>
                  <span
                    className="cds--type-productive-heading-01"
                    style={{ color: "var(--cds-text-secondary)", flexShrink: 0 }}
                  >
                    #{i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <Link href={item.href} style={{ color: "inherit", textDecoration: "none" }}>
                      <p
                        className="cds--type-body-compact-01"
                        style={{
                          fontWeight: 600,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.title}
                      </p>
                    </Link>
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.1875rem" }}>
                      <Tag type={KIND_TAG[item.kind]} size="sm">
                        {KIND_LABEL[item.kind]}
                      </Tag>
                      {item.projectTitle && (
                        <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                          {item.projectTitle}
                        </span>
                      )}
                      {item.ageDays > 0 && (
                        <span
                          className="cds--type-helper-text-01"
                          style={{ color: isOverdueKind ? "var(--cds-support-error)" : "var(--cds-text-secondary)" }}
                        >
                          {item.ageDays}d {isOverdueKind ? "overdue" : "old"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div style={{ flexShrink: 0 }}>
                  <QuickAction item={item} />
                </div>
              </div>
            );
          })
        )}
      </Tile>
    </div>
  );
}
