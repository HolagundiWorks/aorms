import {
  Alert,
  Box,
  Button,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { ACTIVITY_DOMAIN_TAG, activityDomain } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { DataState, StatusDot } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";
import { formatWhen } from "./workHelpers.js";

export function ActivityTab() {
  const [visibility, setVisibility] = useState<"STAFF" | "ALL">("STAFF");
  const listQ = trpc.activity.listOffice.useInfiniteQuery(
    { limit: 25, visibility },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const items = listQ.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <Stack spacing={2.5}>
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2 }}>
        <Typography variant="body2" sx={{ flex: 1, m: 0 }}>
          Office-wide timeline for changes and notes.
        </Typography>
        <TextField
          id="act-vis"
          select
          label="Visibility"
          size="small"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as "STAFF" | "ALL")}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="STAFF">Staff activity</MenuItem>
          <MenuItem value="ALL">All activity</MenuItem>
        </TextField>
      </Box>

      {listQ.error && (
        <Alert severity="error">
          Couldn&apos;t load activity — {listQ.error.message}
        </Alert>
      )}

      <DataState
        loading={listQ.isLoading && items.length === 0}
        isEmpty={!listQ.error && items.length === 0}
        columnCount={4}
        empty={{ title: "No activity yet", description: "Project changes and internal notes will appear here." }}
      >
        <Stack spacing={2}>
          {items.map((item) => {
            const domain = activityDomain(item.eventType);
            const dcolor = ACTIVITY_DOMAIN_TAG[domain];
            return (
              <Box
                key={item.id}
                sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
              >
                <Stack spacing={1}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                    <StatusDot color={dcolor} label={domain} />
                    <StatusDot color="gray" label={item.eventType} />
                    <Typography variant="caption" color="text.secondary">
                      {formatWhen(item.createdAt as unknown as string)}
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ m: 0 }}>{item.summary}</Typography>
                  <Typography variant="body2" sx={{ m: 0 }}>
                    {item.actorName ?? "System"}
                    {item.projectId && (
                      <>
                        {" · "}
                        <Link to={`/projects/${item.projectId}`}>
                          {item.projectRef ?? item.projectTitle ?? "Project"}
                        </Link>
                      </>
                    )}
                  </Typography>
                </Stack>
              </Box>
            );
          })}
          {listQ.hasNextPage && (
            <Box>
              <Button
                variant="outlined"
                disabled={listQ.isFetchingNextPage}
                onClick={() => listQ.fetchNextPage()}
              >
                {listQ.isFetchingNextPage ? "Loading…" : "Load older"}
              </Button>
            </Box>
          )}
        </Stack>
      </DataState>
    </Stack>
  );
}
