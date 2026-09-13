import Link from "next/link";
import { Tag } from "@carbon/react";
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
 * The bare Action Queue row list (2026-09-14 split) — no Tile, no
 * heading, no scroll container of its own. Extracted out of the old
 * `ActionQueue` (which used to own all three) so the exact same ranked
 * rows can be dropped into TodaysBrief.tsx's side panel — see that
 * file's header comment for why the two merged into one full-width
 * tile. The caller supplies the Tile/heading/scroll chrome.
 */
export function ActionQueueList({ items }: { items: PriorityItem[] }) {
  if (items.length === 0) {
    return (
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
        Nothing urgent stands out today.
      </p>
    );
  }

  return (
    <>
      {items.map((item, i) => {
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
      })}
    </>
  );
}
