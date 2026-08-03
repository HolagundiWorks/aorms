import { Select, SelectItem, SkeletonText, Stack } from "@carbon/react";
import { can } from "@esti/contracts";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { StatusDot } from "../../carbon/adapters/index.js";
import { useAuth } from "../../lib/auth.js";
import { trpc } from "../../lib/trpc.js";

const STATUS_TAG: Record<string, "gray" | "blue" | "green"> = {
  NOT_STARTED: "gray",
  IN_PROGRESS: "blue",
  COMPLETE: "green",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Not started",
  IN_PROGRESS: "In progress",
  COMPLETE: "Complete",
};

/** CA / handover live stages — AProc W1.6 (`phaseProgress`). Wave 3 (Carbon). */
export function ProjectPhaseProgress({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const listQ = trpc.phaseProgress.listByProject.useQuery({ projectId });
  const update = trpc.phaseProgress.update.useMutation({
    meta: { errorTitle: "Couldn't update phase stage" },
    onSuccess: () => void utils.phaseProgress.listByProject.invalidate({ projectId }),
  });

  const canWrite = can(user?.role, "write");
  const rows = listQ.data ?? [];

  const byPhase = new Map<string, typeof rows>();
  for (const r of rows) {
    const key = r.phaseId;
    const list = byPhase.get(key) ?? [];
    list.push(r);
    byPhase.set(key, list);
  }

  return (
    <CarbonScope>
      <Stack gap={5}>
        <Stack gap={2}>
          <h4 className="cds--type-heading-03" style={{ margin: 0 }}>
            Phase stages
          </h4>
          <p className="cds--type-body-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
            Live stages within Construction Administration and Handover — owner-side progress for
            the client, not a contractor CPM network.
          </p>
        </Stack>

        {listQ.isLoading && <SkeletonText paragraph lineCount={3} />}

        {!listQ.isLoading && rows.length === 0 && (
          <p className="cds--type-body-01">
            No live stages yet. Add Construction Administration or Handover phases on this project
            to seed stage checklists.
          </p>
        )}

        {[...byPhase.entries()].map(([phaseId, stages]) => {
          const label = stages[0]?.phaseLabel ?? "Phase";
          const code = stages[0]?.phaseCode ?? "";
          return (
            <Stack key={phaseId} gap={3}>
              <p className="cds--type-heading-compact-01" style={{ margin: 0 }}>
                {label}
                {code ? (
                  <span
                    className="cds--type-caption-01"
                    style={{ marginLeft: "0.5rem", color: "var(--cds-text-secondary)" }}
                  >
                    {code}
                  </span>
                ) : null}
              </p>
              {stages.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "0.5rem 0",
                    borderBottom: "1px solid var(--cds-border-subtle)",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <StatusDot color={STATUS_TAG[s.status] ?? "gray"} label={STATUS_LABEL[s.status] ?? s.status} />
                    <span className="cds--type-body-01">{s.label}</span>
                  </div>
                  {canWrite ? (
                    <div style={{ minWidth: 160 }}>
                      <Select
                        id={`phs-${s.id}`}
                        labelText="Status"
                        hideLabel
                        size="sm"
                        value={s.status}
                        disabled={update.isPending}
                        onChange={(e) =>
                          update.mutate({
                            id: s.id,
                            projectId,
                            status: e.target.value as "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE",
                          })
                        }
                      >
                        <SelectItem value="NOT_STARTED" text="Not started" />
                        <SelectItem value="IN_PROGRESS" text="In progress" />
                        <SelectItem value="COMPLETE" text="Complete" />
                      </Select>
                    </div>
                  ) : null}
                </div>
              ))}
            </Stack>
          );
        })}
      </Stack>
    </CarbonScope>
  );
}
