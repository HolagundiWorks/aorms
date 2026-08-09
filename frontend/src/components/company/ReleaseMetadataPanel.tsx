import {
  Alert,
  Box,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { StatusDot } from "../../carbon/adapters/index.js";

export function ReleaseMetadataPanel() {
  // Same payload as GET /health — avoids a separate tRPC route and matches deploy probes.
  const releaseQ = useQuery({
    queryKey: ["release-health"],
    queryFn: async () => {
      const res = await fetch("/health");
      if (!res.ok) throw new Error(`Health check failed (${res.status})`);
      return res.json() as Promise<{
        ok: boolean;
        app: string;
        version: string;
        revision: string;
        nodeEnv: string;
        builtAt: string | null;
        checks: { db: boolean; redis: boolean; storage: boolean };
      }>;
    },
    staleTime: 30_000,
  });

  const check = (ok: boolean, label: string) => (
    <StatusDot color={ok ? "green" : "red"} label={`${label} ${ok ? "OK" : "down"}`} />
  );

  return (
    <Box sx={{ p: 2, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Typography variant="h5" component="h2" sx={{ m: 0 }}>
          Release &amp; readiness
        </Typography>
        <Typography variant="body2" sx={{ m: 0 }}>
          Build revision and backing-service checks for production operations.
        </Typography>
        {releaseQ.isLoading && (
          <Stack spacing={1}>
            <Skeleton variant="text" width="60%" />
            <Skeleton variant="text" width="80%" />
            <Skeleton variant="text" width="40%" />
          </Stack>
        )}
        {releaseQ.isError && (
          <Alert severity="error">
            Health check failed —{" "}
            {releaseQ.error instanceof Error ? releaseQ.error.message : "Unknown error"}
          </Alert>
        )}
        {releaseQ.data && (
          <>
            <Table size="small">
              <TableBody>
                <TableRow>
                  <TableCell>Application</TableCell>
                  <TableCell>{releaseQ.data.app}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Version</TableCell>
                  <TableCell>{releaseQ.data.version}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Revision</TableCell>
                  <TableCell>
                    <code>{releaseQ.data.revision}</code>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Environment</TableCell>
                  <TableCell>{releaseQ.data.nodeEnv}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {check(releaseQ.data.checks.db, "Database")}
              {check(releaseQ.data.checks.redis, "Redis")}
              {check(releaseQ.data.checks.storage, "Storage")}
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ m: 0 }}>
              Public liveness: <code>/health</code> · dependency probe: <code>/readyz</code>
            </Typography>
          </>
        )}
      </Stack>
    </Box>
  );
}
