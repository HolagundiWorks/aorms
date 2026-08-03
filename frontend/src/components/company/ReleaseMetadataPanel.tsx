import {
  InlineNotification,
  SkeletonText,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
} from "@carbon/react";
import { useQuery } from "@tanstack/react-query";
import { CarbonScope } from "../../carbon/CarbonScope.js";
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
    <CarbonScope>
      <div style={{ padding: "1rem", maxWidth: 760 }}>
        <Stack gap={5}>
          <h2 className="cds--type-heading-05" style={{ margin: 0 }}>
            Release &amp; readiness
          </h2>
          <p className="cds--type-body-01" style={{ margin: 0 }}>
            Build revision and backing-service checks for production operations.
          </p>
          {releaseQ.isLoading && <SkeletonText paragraph lineCount={3} />}
          {releaseQ.isError && (
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Health check failed"
              subtitle={releaseQ.error instanceof Error ? releaseQ.error.message : "Unknown error"}
            />
          )}
          {releaseQ.data && (
            <>
              <Table size="sm">
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
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {check(releaseQ.data.checks.db, "Database")}
                {check(releaseQ.data.checks.redis, "Redis")}
                {check(releaseQ.data.checks.storage, "Storage")}
              </div>
              <p className="cds--type-caption-01" style={{ margin: 0, color: "var(--cds-text-secondary)" }}>
                Public liveness: <code>/health</code> · dependency probe: <code>/readyz</code>
              </p>
            </>
          )}
        </Stack>
      </div>
    </CarbonScope>
  );
}
