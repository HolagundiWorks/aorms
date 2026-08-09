import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  DEFAULT_ESCALATION_SETTINGS,
  type EscalationSettings,
  parseEscalationSettings,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc.js";

export function EscalationSettingsPanel() {
  const utils = trpc.useUtils();
  const settingsQ = trpc.settings.get.useQuery();
  const [form, setForm] = useState<EscalationSettings>(DEFAULT_ESCALATION_SETTINGS);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data?.escalationSettings) {
      setForm(parseEscalationSettings(settingsQ.data.escalationSettings));
    }
  }, [settingsQ.data]);

  const save = trpc.settings.setEscalationSettings.useMutation({
    meta: { errorTitle: "Couldn't save the escalation rules" },
    onSuccess: () => {
      utils.settings.get.invalidate();
      setMsg("Alert escalation rules saved");
    },
  });

  const num = (value: string, fallback: number) => Number(value) || fallback;

  return (
    <Box sx={{ p: 2, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h2" sx={{ m: 0 }}>
          Alert escalation
        </Typography>
        <Typography variant="body2" sx={{ m: 0 }}>
          Controls when client approvals, follow-ups, overdue tasks, and leave appear as
          immediate alerts vs the daily digest on the Alerts page.
        </Typography>
        {msg && (
          <Alert severity="success" onClose={() => setMsg(null)}>
            {msg}
          </Alert>
        )}
        <TextField
          id="esc-stale"
          type="number"
          label="Stale client approval (days)"
          helperText="Approvals unanswered for this many days become immediate alerts."
          value={form.staleApprovalDays}
          onChange={(e) =>
            setForm((f) => ({ ...f, staleApprovalDays: num(e.target.value, 7) }))
          }
          fullWidth
        />
        <TextField
          id="esc-followup"
          type="number"
          label="Follow-up lead time (days before due)"
          helperText="0 = alert on the due date only."
          value={form.followUpLeadDays}
          onChange={(e) =>
            setForm((f) => ({ ...f, followUpLeadDays: num(e.target.value, 0) }))
          }
          fullWidth
        />
        <TextField
          id="esc-task"
          type="number"
          label="Overdue task threshold (days past due)"
          value={form.taskOverdueDays}
          onChange={(e) =>
            setForm((f) => ({ ...f, taskOverdueDays: num(e.target.value, 3) }))
          }
          fullWidth
        />
        <TextField
          id="esc-leave"
          type="number"
          label="Leave horizon (days ahead)"
          helperText="Approved leave starting within this window surfaces on alerts."
          value={form.leaveHorizonDays}
          onChange={(e) =>
            setForm((f) => ({ ...f, leaveHorizonDays: num(e.target.value, 7) }))
          }
          fullWidth
        />
        <FormControlLabel
          control={
            <Switch
              checked={form.digestEnabled}
              onChange={(e) => setForm((f) => ({ ...f, digestEnabled: e.target.checked }))}
            />
          }
          label="Daily digest"
        />
        <Box>
          <Button variant="contained" disabled={save.isPending} onClick={() => save.mutate(form)}>
            {save.isPending ? "Saving…" : "Save escalation rules"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
