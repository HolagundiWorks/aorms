import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { IconButton, Tooltip, Typography } from "@mui/material";
import { chromeIconSx } from "@hcw/ui-kit";
import { useAuth } from "../lib/auth.js";
import { useRuntimeCapabilities, useSyncStatus } from "../lib/runtimeCapabilities.js";
import { trpc } from "../lib/trpc.js";

/**
 * Offline / hub sync queue indicator for the taskbar tray.
 * Shows when the install is hub-bound and there are pending/failed outbox rows
 * (artifacts + metadata). Owners can click to flush.
 */
export function SyncQueueChip() {
  const { user } = useAuth();
  const caps = useRuntimeCapabilities();
  const sync = useSyncStatus();
  const flush = trpc.sync.flush.useMutation({
    onSuccess: () => sync.refetch(),
  });
  const canFlush = user?.role === "OWNER";

  if (!caps.metaSync && !caps.artifactSync && !sync.hubConfigured) {
    if (caps.host !== "desktop") return null;
    return (
      <Tooltip title="Desktop offline — hub sync not bound">
        <span>
          <IconButton size="small" disabled aria-label="Sync offline" sx={chromeIconSx}>
            <CloudOffOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  if (!sync.hasOfflineQueue && sync.hubConfigured) {
    return (
      <Tooltip title="Hub sync idle">
        <span>
          <IconButton size="small" disabled aria-label="Sync idle" sx={chromeIconSx}>
            <CloudDoneOutlined fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  if (!sync.hasOfflineQueue) return null;

  const label = sync.failed
    ? `${sync.failed} sync failed`
    : `${sync.pending} waiting to sync`;

  return (
    <Tooltip title={canFlush ? `${label} — click to flush` : label}>
      <span>
        <IconButton
          size="small"
          aria-label={label}
          sx={chromeIconSx}
          disabled={!canFlush || flush.isPending}
          onClick={() => canFlush && flush.mutate()}
        >
          <CloudUploadOutlined fontSize="small" color={sync.failed ? "error" : "warning"} />
          <Typography
            component="span"
            variant="caption"
            sx={{ ml: 0.25, fontVariantNumeric: "tabular-nums" }}
          >
            {sync.pending || sync.failed}
          </Typography>
        </IconButton>
      </span>
    </Tooltip>
  );
}
