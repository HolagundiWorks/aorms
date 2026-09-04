import { Button, Stack, TextField, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import { StatusDot } from "../carbon/adapters/index.js";
import { trpc } from "../lib/trpc.js";

/** Phase 0 appointment card. */
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
    <Stack spacing={2.5} sx={{ mt: 2 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <Typography variant="h6" sx={{ m: 0 }}>
          Phase 0 — Appointment
        </Typography>
        <StatusDot color={tagColor} label={row?.status ?? "Not started"} />
      </div>
      <Typography variant="body2" color="text.secondary" sx={{ m: 0 }}>
        Pre-engagement site visit, scope confirmation, and letter of appointment before full
        initiation.
      </Typography>
      <TextField
        id="appt-date"
        label="Site visit date"
        type="date"
        size="small"
        defaultValue={row?.siteVisitDate ?? ""}
        slotProps={{ inputLabel: { shrink: true } }}
        onBlur={(e) =>
          upsert.mutate({
            projectId,
            siteVisitDate: e.target.value || undefined,
            scopeSummary: row?.scopeSummary ?? undefined,
          })
        }
      />
      <TextField
        id="appt-scope"
        label="Scope summary"
        multiline
        rows={4}
        fullWidth
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
        <Button component={Link} to="/office/letters" variant="outlined" size="small">
          Draft letter of appointment
        </Button>
        <Button component={Link} to="/accounting/fees" variant="outlined" size="small">
          Fee proposal
        </Button>
        {row?.status !== "COMPLETE" && (
          <Button
            size="small"
            variant="contained"
            disabled={complete.isPending}
            onClick={() => complete.mutate({ projectId })}
          >
            Mark appointment complete
          </Button>
        )}
      </div>
    </Stack>
  );
}
