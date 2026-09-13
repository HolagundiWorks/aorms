import { ChartLineData, CheckmarkFilled, Devices, Time, WarningFilled } from "@carbon/icons-react";
import { Column, Grid, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Tag } from "@carbon/react";
import { createClient } from "../../../lib/supabase/server";
import { PageHeader } from "../../../components/aorms/PageHeader";
import { KpiTile } from "../../../components/aorms/KpiTile";
import { ContextPanel, ContextPanelContent, ContextPanelLayout, ContextPanelTrigger } from "../../../components/aorms/ContextPanel";
import { RegisterDeviceForm } from "../../../components/aorms/ai-devices/RegisterDeviceForm";
import { RemoveDeviceButton } from "../../../components/aorms/ai-devices/RemoveDeviceButton";

/**
 * Esti Mobile Inference — device monitoring (2026-09-13), Phase A of the
 * attached development guide's own implementation order: registry +
 * monitoring UI before the actual WSS gateway/device-client wiring goes
 * live (§30 Device Status, §36 Health Monitoring). Registration/removal
 * are staff actions (RLS insert/delete policies — migration 0043); every
 * OTHER write (status, heartbeat, counters) comes from the device
 * gateway service via the service-role key, never from this page.
 */

const STATUS_TAG: Record<string, "green" | "gray" | "blue" | "magenta" | "red"> = {
  online: "green",
  offline: "gray",
  connecting: "blue",
  busy: "magenta",
  error: "red",
};

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default async function AiDevicesPage() {
  const supabase = await createClient();
  const { data: devices, error } = await supabase
    .from("ai_devices")
    .select(
      "id, device_id, device_name, device_type, status, model_name, runtime, app_version, connection_count, inference_count, successful_requests, failed_requests, average_latency_ms, last_seen_at, last_error",
    )
    .order("last_seen_at", { ascending: false, nullsFirst: false });

  const rows = devices ?? [];
  const onlineCount = rows.filter((d) => d.status === "online").length;
  const busyCount = rows.filter((d) => d.status === "busy").length;
  const errorCount = rows.filter((d) => d.status === "error").length;
  const totalInferences = rows.reduce((sum, d) => sum + (d.inference_count ?? 0), 0);

  return (
    <ContextPanelLayout>
      <ContextPanel title="Register device" description="Issue a new per-device credential for a phone or server to run Esti.">
        <RegisterDeviceForm />
      </ContextPanel>
      <ContextPanelContent>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <PageHeader
              title="Esti Devices"
              description="Inference devices registered to run Esti — status, model, and health, per the mobile inference architecture."
              actions={<ContextPanelTrigger size="sm">Register device</ContextPanelTrigger>}
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, 11rem)",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              <KpiTile label="Registered devices" value={rows.length} icon={Devices} />
              <KpiTile label="Online" value={onlineCount} status={onlineCount > 0 ? "NORMAL" : undefined} icon={CheckmarkFilled} />
              <KpiTile label="Busy" value={busyCount} icon={Time} />
              <KpiTile label="Error" value={errorCount} status={errorCount > 0 ? "CRITICAL" : "NORMAL"} icon={WarningFilled} />
              <KpiTile label="Total inferences served" value={totalInferences} icon={ChartLineData} />
            </div>

            {error ? (
              <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
                Couldn&apos;t load devices: {error.message}
              </p>
            ) : (
              <Table aria-label="Esti devices">
                <TableHead>
                  <TableRow>
                    <TableHeader>Device</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader>Model / runtime</TableHeader>
                    <TableHeader>Last seen</TableHeader>
                    <TableHeader>Requests (ok/fail)</TableHeader>
                    <TableHeader>Avg latency</TableHeader>
                    <TableHeader>Actions</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div>{d.device_name ?? d.device_id}</div>
                        <div className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                          {d.device_id} · {d.device_type}
                          {d.app_version ? ` · v${d.app_version}` : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Tag type={STATUS_TAG[d.status] ?? "gray"} size="sm">
                          {d.status.toUpperCase()}
                        </Tag>
                        {d.status === "error" && d.last_error && (
                          <div className="cds--type-helper-text-01" style={{ color: "var(--cds-support-error)", marginTop: "0.25rem" }}>
                            {d.last_error}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {d.model_name ?? "—"}
                        {d.runtime ? <span style={{ color: "var(--cds-text-secondary)" }}> · {d.runtime}</span> : null}
                      </TableCell>
                      <TableCell>{relativeTime(d.last_seen_at)}</TableCell>
                      <TableCell>
                        {d.successful_requests ?? 0}/{d.failed_requests ?? 0}
                      </TableCell>
                      <TableCell>{d.average_latency_ms != null ? `${Math.round(d.average_latency_ms)}ms` : "—"}</TableCell>
                      <TableCell>
                        <RemoveDeviceButton deviceId={d.device_id} />
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                          No devices registered yet — register one to issue it a credential.
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </Column>
        </Grid>
      </ContextPanelContent>
    </ContextPanelLayout>
  );
}
