import Link from "next/link";
import { Column, Grid, Tag, Tile } from "@carbon/react";
import type { PriorityItem } from "../../../lib/dashboard/priority";

const KIND_LABEL: Record<PriorityItem["kind"], string> = {
  TASK: "Task",
  APPROVAL: "Approval",
  CLIENT_REQUEST: "Client request",
  CONSULTANT_REQUEST: "Consultant request",
};

const KIND_TAG: Record<PriorityItem["kind"], "red" | "purple" | "blue" | "teal"> = {
  TASK: "red",
  APPROVAL: "purple",
  CLIENT_REQUEST: "blue",
  CONSULTANT_REQUEST: "teal",
};

/**
 * Top 3 Priorities (2026-09-10) — the ranked pool from
 * lib/dashboard/priority.ts's getTopPriorities(), across tasks,
 * approvals, and client/consultant requests. See that file's own header
 * comment for the exact scoring formula.
 */
export function TopPriorities({ items }: { items: PriorityItem[] }) {
  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <h2 className="cds--type-heading-02" style={{ marginBottom: "1rem" }}>
        Top 3 priorities today
      </h2>
      {items.length === 0 ? (
        <Tile>
          <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
            Nothing urgent stands out today.
          </p>
        </Tile>
      ) : (
        <Grid narrow>
          {items.map((item, i) => (
            <Column key={`${item.kind}:${item.id}`} sm={4} md={4} lg={5} style={{ marginBottom: "1rem" }}>
              <Link href={item.href} style={{ color: "inherit", textDecoration: "none", display: "block", height: "100%" }}>
                <Tile style={{ height: "100%" }}>
                  <p className="cds--type-productive-heading-01" style={{ color: "var(--cds-text-secondary)" }}>
                    #{i + 1}
                  </p>
                  <h3 className="cds--type-productive-heading-03" style={{ marginTop: "0.25rem" }}>
                    {item.title}
                  </h3>
                  <p className="cds--type-body-01" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
                    {item.projectTitle ?? "—"}
                  </p>
                  <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Tag type={KIND_TAG[item.kind]} size="sm">
                      {KIND_LABEL[item.kind]}
                    </Tag>
                    {item.ageDays > 0 && (
                      <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {item.ageDays} day{item.ageDays === 1 ? "" : "s"} old
                      </span>
                    )}
                  </div>
                </Tile>
              </Link>
            </Column>
          ))}
        </Grid>
      )}
    </div>
  );
}
