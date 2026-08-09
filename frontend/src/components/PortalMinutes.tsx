import {
  Box,
  Button,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { StatusDot } from "./StatusTag.js";
import { useState } from "react";
import { trpc } from "../lib/trpc.js";

/**
 * Client portal — issued meeting minutes (read-only).
 * ESTI drafting was removed from firm portals; clients raise change requests
 * via the manual form on the project page.
 */
export function PortalMinutes({ projectId }: { projectId: string }) {
  const momsQ = trpc.portal.listMoms.useQuery({ projectId });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const moms = momsQ.data ?? [];

  return (
    <Stack spacing={1}>
      <Typography variant="h6" component="h4">Meeting minutes</Typography>
      <p className="esti-label esti-label--secondary">
        Minutes your architect has issued. Read them here; raise change requests
        from the form above when you need a revision.
      </p>

      {momsQ.isLoading && (
        <Stack spacing={0.5}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={32} />
          ))}
        </Stack>
      )}
      {!momsQ.isLoading && moms.length === 0 && (
        <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
          <Typography variant="body1">No issued meeting minutes yet.</Typography>
        </Box>
      )}

      <Stack spacing={1}>
        {moms.map((m) => (
          <Box key={m.id} sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
            <Stack spacing={1}>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <Typography variant="body1">
                  <strong>{m.ref} — {m.title}</strong>
                </Typography>
                {m.meetingDate && (
                  <StatusDot color="cool-gray" label={m.meetingDate} />
                )}
              </Stack>
              {m.attendees && (
                <p className="esti-label esti-label--secondary">Attendees: {m.attendees}</p>
              )}
              {expandedId === m.id && m.minutes && (
                <Typography variant="body1" sx={{ whiteSpace: "pre-wrap" }}>{m.minutes}</Typography>
              )}
              <Button
                variant="text"
                size="small"
                onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
              >
                {expandedId === m.id ? "Hide minutes" : "Read minutes"}
              </Button>
            </Stack>
          </Box>
        ))}
      </Stack>
    </Stack>
  );
}
