import { Button, Stack, TextArea, TextInput } from "@carbon/react";
import { Link } from "react-router-dom";
import { CarbonScope } from "../carbon/CarbonScope.js";
import { StatusDot } from "../carbon/adapters/index.js";
import { trpc } from "../lib/trpc.js";

/** Phase 0 appointment card. Wave 3 (Carbon). */
export function ProjectAppointment({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const q = trpc.appointments.byProject.useQuery({ projectId });
  const upsert = trpc.appointments.upsert.useMutation({
    meta: { errorTitle: "Couldn't save the appointment" },
    onSuccess: () => utils.appointments.byProject.invalidate({ projectId }),
  });
  const complete = trpc.appointments.complete.useMutation({
    meta: { errorTitle: "Couldn't complete the appointment" },
    onSuccess: () => utils.appointments.byProject.invalidate({ projectId }),
  });

  const row = q.data;
  const tagColor = row?.status === "COMPLETE" ? "green" : "blue";

  return (
    <CarbonScope>
      <Stack gap={5} style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <h3 className="cds--type-heading-03" style={{ margin: 0 }}>
            Phase 0 — Appointment
          </h3>
          <StatusDot color={tagColor} label={row?.status ?? "Not started"} />
        </div>
        <p className="cds--type-body-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
          Pre-engagement site visit, scope confirmation, and letter of appointment before full
          initiation.
        </p>
        <TextInput
          id="appt-date"
          labelText="Site visit date"
          type="date"
          defaultValue={row?.siteVisitDate ?? ""}
          onBlur={(e) =>
            upsert.mutate({
              projectId,
              siteVisitDate: e.target.value || undefined,
              scopeSummary: row?.scopeSummary ?? undefined,
            })
          }
        />
        <TextArea
          id="appt-scope"
          labelText="Scope summary"
          rows={4}
          defaultValue={row?.scopeSummary ?? ""}
          onBlur={(e) =>
            upsert.mutate({
              projectId,
              scopeSummary: e.target.value,
              siteVisitDate: row?.siteVisitDate ?? undefined,
            })
          }
        />
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Button as={Link} to="/office/letters" kind="secondary" size="sm">
            Draft letter of appointment
          </Button>
          <Button as={Link} to="/accounting/fees" kind="secondary" size="sm">
            Fee proposal
          </Button>
          {row?.status !== "COMPLETE" && (
            <Button
              size="sm"
              disabled={complete.isPending}
              onClick={() => complete.mutate({ projectId })}
            >
              Mark appointment complete
            </Button>
          )}
        </div>
      </Stack>
    </CarbonScope>
  );
}
