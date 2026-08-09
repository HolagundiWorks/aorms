import ContentCopy from "@mui/icons-material/ContentCopy";
import Event from "@mui/icons-material/Event";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { WorkloadCalendarScope } from "@esti/contracts";
import { useState } from "react";
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
    <Box sx={{ p: 1 }}>
      <Stack spacing={2}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Event fontSize="small" aria-hidden />
          <Typography variant="h6" component="h3" sx={{ m: 0 }}>
            Sync with Google Calendar
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ m: 0 }}>
          Subscribe to your open task due dates as an iCal feed. Google refreshes subscribed
          calendars about once per hour.
        </Typography>

        {canOffice && (
          <TextField
            id="cal-scope"
            select
            label="Calendar scope"
            value={scope}
            onChange={(e) => setScope(e.target.value as WorkloadCalendarScope)}
            fullWidth
          >
            <MenuItem value="mine">My tasks</MenuItem>
            <MenuItem value="office">Whole office (all due tasks)</MenuItem>
          </TextField>
        )}

        <TextField
          id="cal-https"
          label="Subscription URL (HTTPS)"
          helperText={googleHelp}
          value={httpsUrl}
          slotProps={{ input: { readOnly: true } }}
          fullWidth
        />
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<ContentCopy />}
            onClick={() => {
              if (!httpsUrl) return;
              void navigator.clipboard.writeText(httpsUrl).then(() => setCopied(true));
            }}
          >
            {copied ? "Copied" : "Copy URL"}
          </Button>
          <Button
            variant="outlined"
            size="small"
            disabled={!webcalUrl}
            onClick={() => window.open(webcalUrl, "_blank", "noopener,noreferrer")}
          >
            Open webcal link
          </Button>
          <Button
            variant="text"
            size="small"
            disabled={regenerate.isPending}
            onClick={() => regenerate.mutate()}
          >
            {regenerate.isPending ? "Rotating…" : "Rotate link"}
          </Button>
        </Box>

        {copied && (
          <Alert severity="success" onClose={() => setCopied(false)}>
            Link copied — paste it in Google Calendar under Other calendars → From URL.
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary" className="esti-label--secondary">
          Rotating the link revokes the old URL. Keep this link private — anyone with it can
          read task titles and due dates in the feed scope you chose.
        </Typography>
      </Stack>
    </Box>
  );
}
