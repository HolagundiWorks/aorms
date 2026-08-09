import CloudDoneOutlined from "@mui/icons-material/CloudDoneOutlined";
import CloudOffOutlined from "@mui/icons-material/CloudOffOutlined";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { IconButton, Tooltip, Typography } from "@mui/material";
import { chromeIconSx } from "@hcw/ui-kit";
import { useAuth } from "../lib/auth.js";
import { isDesktopClient, useRuntimeCapabilities, useSyncStatus } from "../lib/runtimeCapabilities.js";
import { PORTAL_CHROME } from "../lib/portal-chrome.js";
import { trpc } from "../lib/trpc.js";

const HIT = PORTAL_CHROME.footerHitPx;

const flatSx = {
  ...chromeIconSx,
  width: HIT,
  height: HIT,
  borderRadius: "8px",
  background: "transparent",
  boxShadow: "none",
  "&:hover": {
    backgroundColor: "action.hover",
    boxShadow: "none",
    transform: "none",
  },
  "&:active": {
    boxShadow: "none",
    transform: "none",
  },
  "&.Mui-disabled": {
    background: "transparent",
    boxShadow: "none",
  },
} as const;

/**
 * Offline / hub sync queue indicator — flat icon (no neu chip).
 * Desktop tray only.
 */
export function SyncQueueChip({ flat = false }: { flat?: boolean } = {}) {
  const { user } = useAuth();
  const desktop = isDesktopClient();
  const caps = useRuntimeCapabilities();
  const sync = useSyncStatus();
  const flush = trpc.sync.flush.useMutation({
    onSuccess: () => sync.refetch(),
  });
  const canFlush = user?.role === "OWNER";
  const btnSx = flat ? flatSx : chromeIconSx;
  const flatClass = flat ? "esti-app-footer__flat" : undefined;

  if (!desktop) return null;

  if (!caps.metaSync && !caps.artifactSync && !sync.hubConfigured) {
    return (
      <Tooltip title="Desktop offline — hub sync not bound">
        <span>
          <IconButton
            size="small"
            disabled
            aria-label="Sync offline"
            className={flatClass}
            sx={btnSx}
          >
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
          <IconButton
            size="small"
            disabled
            aria-label="Sync idle"
            className={flatClass}
            sx={btnSx}
          >
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
          className={flatClass}
          sx={btnSx}
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
