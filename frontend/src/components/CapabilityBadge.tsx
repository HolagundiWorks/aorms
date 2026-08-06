import { Stack, Typography } from "@mui/material";
import { StatusDot } from "./StatusTag.js";
import {
  buildTimeHost,
  useRuntimeCapabilities,
  type AiComputeLocation,
} from "../lib/runtimeCapabilities.js";

/**
 * Local vs Hosted AI badge (LF5 / DESKTOP-WEB-PARITY-UX).
 * Same Ask ESTI / AI Studio panel on both hosts — only the compute label changes.
 */
export function CapabilityBadge({
  size = "sm",
  showHost = false,
}: {
  size?: "sm" | "md";
  /** Also show Web / Desktop host chip. */
  showHost?: boolean;
}) {
  const caps = useRuntimeCapabilities();
  const compute: AiComputeLocation = caps.aiCompute;
  const host = caps.clientHost;

  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
      <StatusDot
        size={size}
        color={compute === "local" ? "green" : "blue"}
        label={compute === "local" ? "Local AI" : "Hosted AI"}
      />
      {showHost && (
        <Typography variant="caption" color="text.secondary">
          {host === "desktop" ? "Desktop" : host === "hub" ? "Hub" : "Web"}
        </Typography>
      )}
    </Stack>
  );
}

/** Compact tray hint — web hosts only (desktop already has SyncQueueChip). */
export function RuntimeHostTrayHint() {
  const host = buildTimeHost();
  if (host === "desktop") return null;
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      sx={{ px: 0.5, display: { xs: "none", md: "inline" } }}
      title="Web parity — AI and heavy jobs run on the hub"
    >
      Web
    </Typography>
  );
}
