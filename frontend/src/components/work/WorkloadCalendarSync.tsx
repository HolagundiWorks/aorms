import { Button, InlineNotification, Select, SelectItem, Stack, TextInput } from "@carbon/react";
import { Calendar, Copy } from "@carbon/icons-react";
import type { WorkloadCalendarScope } from "@esti/contracts";
import { useState } from "react";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { trpc } from "../../lib/trpc.js";

export function WorkloadCalendarSync() {
  const utils = trpc.useUtils();
  const [scope, setScope] = useState<WorkloadCalendarScope>("mine");
  const [copied, setCopied] = useState(false);

  const subQ = trpc.workload.calendarSubscription.useQuery({
    scope,
    origin: window.location.origin,
  });

  const regenerate = trpc.workload.regenerateCalendarToken.useMutation({
    meta: { errorTitle: "Couldn't regenerate the calendar link" },
    onSuccess: () => {
      utils.workload.calendarSubscription.invalidate();
    },
  });

  const httpsUrl = subQ.data?.httpsUrl ?? "";
  const webcalUrl = subQ.data?.webcalUrl ?? "";
  const canOffice = subQ.data?.canOfficeScope ?? false;

  const googleHelp =
    "Google Calendar → Other calendars → + → From URL → paste the HTTPS link below.";

  return (
    <CarbonScope>
      <div style={{ padding: "0.5rem" }}>
        <Stack gap={5}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Calendar size={20} aria-hidden />
            <h3 className="cds--type-heading-03" style={{ margin: 0 }}>
              Sync with Google Calendar
            </h3>
          </div>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            Subscribe to your open task due dates as an iCal feed. Google refreshes subscribed
            calendars about once per hour.
          </p>

          {canOffice && (
            <Select
              id="cal-scope"
              labelText="Calendar scope"
              value={scope}
              onChange={(e) => setScope(e.target.value as WorkloadCalendarScope)}
            >
              <SelectItem value="mine" text="My tasks" />
              <SelectItem value="office" text="Whole office (all due tasks)" />
            </Select>
          )}

          <TextInput
            id="cal-https"
            labelText="Subscription URL (HTTPS)"
            helperText={googleHelp}
            value={httpsUrl}
            readOnly
          />
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <Button
              kind="secondary"
              size="sm"
              renderIcon={Copy}
              onClick={() => {
                if (!httpsUrl) return;
                void navigator.clipboard.writeText(httpsUrl).then(() => setCopied(true));
              }}
            >
              {copied ? "Copied" : "Copy URL"}
            </Button>
            <Button
              kind="secondary"
              size="sm"
              disabled={!webcalUrl}
              onClick={() => window.open(webcalUrl, "_blank", "noopener,noreferrer")}
            >
              Open webcal link
            </Button>
            <Button
              kind="ghost"
              size="sm"
              disabled={regenerate.isPending}
              onClick={() => regenerate.mutate()}
            >
              {regenerate.isPending ? "Rotating…" : "Rotate link"}
            </Button>
          </div>

          {copied && (
            <InlineNotification
              kind="success"
              lowContrast
              title="Link copied"
              subtitle="Paste it in Google Calendar under Other calendars → From URL."
              onCloseButtonClick={() => setCopied(false)}
            />
          )}

          <p className="esti-label--secondary">
            Rotating the link revokes the old URL. Keep this link private — anyone with it can
            read task titles and due dates in the feed scope you chose.
          </p>
        </Stack>
      </div>
    </CarbonScope>
  );
}
