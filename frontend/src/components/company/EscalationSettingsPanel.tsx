import { Button, InlineNotification, NumberInput, Stack, Toggle } from "@carbon/react";
import {
  DEFAULT_ESCALATION_SETTINGS,
  type EscalationSettings,
  parseEscalationSettings,
} from "@esti/contracts";
import { useEffect, useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
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

  const num = (value: string | number, fallback: number) => Number(value) || fallback;

  return (
    <CarbonScope>
      <div style={{ padding: "1rem", maxWidth: 760 }}>
        <Stack gap={5}>
          <h2 className="cds--type-heading-05" style={{ margin: 0 }}>
            Alert escalation
          </h2>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            Controls when client approvals, follow-ups, overdue tasks, and leave appear as
            immediate alerts vs the daily digest on the Alerts page.
          </p>
          {msg && (
            <InlineNotification
              kind="success"
              lowContrast
              title="Saved"
              subtitle={msg}
              onCloseButtonClick={() => setMsg(null)}
            />
          )}
          <NumberInput
            id="esc-stale"
            label="Stale client approval (days)"
            helperText="Approvals unanswered for this many days become immediate alerts."
            value={form.staleApprovalDays}
            onChange={(_e, { value }) =>
              setForm((f) => ({ ...f, staleApprovalDays: num(value, 7) }))
            }
          />
          <NumberInput
            id="esc-followup"
            label="Follow-up lead time (days before due)"
            helperText="0 = alert on the due date only."
            value={form.followUpLeadDays}
            onChange={(_e, { value }) =>
              setForm((f) => ({ ...f, followUpLeadDays: num(value, 0) }))
            }
          />
          <NumberInput
            id="esc-task"
            label="Overdue task threshold (days past due)"
            value={form.taskOverdueDays}
            onChange={(_e, { value }) =>
              setForm((f) => ({ ...f, taskOverdueDays: num(value, 3) }))
            }
          />
          <NumberInput
            id="esc-leave"
            label="Leave horizon (days ahead)"
            helperText="Approved leave starting within this window surfaces on alerts."
            value={form.leaveHorizonDays}
            onChange={(_e, { value }) =>
              setForm((f) => ({ ...f, leaveHorizonDays: num(value, 7) }))
            }
          />
          <Toggle
            id="esc-digest"
            labelText="Daily digest"
            toggled={form.digestEnabled}
            onToggle={(checked) => setForm((f) => ({ ...f, digestEnabled: checked }))}
          />
          <div>
            <Button disabled={save.isPending} onClick={() => save.mutate(form)}>
              {save.isPending ? "Saving…" : "Save escalation rules"}
            </Button>
          </div>
        </Stack>
      </div>
    </CarbonScope>
  );
}
