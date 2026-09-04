import Close from "@mui/icons-material/Close";
import {
  Box,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { Surface } from "@hcw/ui-kit";
import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  closeRightSlot,
  setRightSlotTab,
  useRightSlot,
  wireRightSlotWindowEvents,
  type RightSlotTab,
} from "../../lib/right-slot.js";
import { AskEstiPanel } from "../AskEstiPanel.js";

/**
 * LF6 — one docked right slot: Properties ↔ Ask ESTI.
 * Mirrors GlassRail geometry on the opposite edge. Same component on web and
 * desktop (DESKTOP-WEB-PARITY-UX). Do not add a second AI chrome elsewhere.
 */
export function RightSlot() {
  const { open, tab, inspector } = useRightSlot();
  const { pathname } = useLocation();

  useEffect(() => wireRightSlotWindowEvents(), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRightSlot();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const shell = document.querySelector(".esti-app-shell2");
    if (!shell) return;
    shell.classList.toggle("esti-app-shell2--right-slot-open", open);
    return () => {
      shell.classList.remove("esti-app-shell2--right-slot-open");
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Mobile backdrop — desktop keeps stage visible beside the slot. */}
      <Box
        className="esti-right-slot__backdrop"
        onClick={() => closeRightSlot()}
        aria-hidden
      />
      <aside
        className="esti-right-slot"
        role="complementary"
        aria-label={tab === "ask" ? "Ask ESTI" : "Inspector"}
      >
        <Surface
          layer="soft"
          className="hcw-surface esti-right-slot__surface"
          sx={{ height: "100%", p: 2, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <Stack
            className="esti-right-slot__chrome"
            spacing={1.5}
            sx={{ height: "100%", minHeight: 0 }}
          >
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: "center", justifyContent: "space-between" }}
            >
              <ToggleButtonGroup
                exclusive
                size="small"
                value={tab}
                onChange={(_, next: RightSlotTab | null) => {
                  if (next) setRightSlotTab(next);
                }}
                aria-label="Right slot mode"
              >
                <ToggleButton value="properties" aria-label="Properties">
                  Properties
                </ToggleButton>
                <ToggleButton value="ask" aria-label="Ask ESTI">
                  Ask ESTI
                </ToggleButton>
              </ToggleButtonGroup>
              <IconButton
                className="esti-neu-btn"
                aria-label="Close right slot"
                size="small"
                onClick={() => closeRightSlot()}
              >
                <Close fontSize="small" />
              </IconButton>
            </Stack>

            <Box className="esti-right-slot__body" sx={{ flex: "1 1 auto", minHeight: 0, overflowY: "auto" }}>
              {tab === "ask" ? (
                <AskEstiPanel />
              ) : (
                <PropertiesPanel pathname={pathname} inspector={inspector} />
              )}
            </Box>
          </Stack>
        </Surface>
      </aside>
    </>
  );
}

function PropertiesPanel({
  pathname,
  inspector,
}: {
  pathname: string;
  inspector: ReturnType<typeof useRightSlot>["inspector"];
}) {
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const routeFields = [
    { label: "Route", value: pathname || "/" },
    ...(projectId
      ? [{ label: "Project", value: projectId }]
      : ([] as { label: string; value: string }[])),
  ];

  if (inspector) {
    return (
      <Stack spacing={1.5}>
        <div>
          <Typography variant="overline" color="text.secondary">
            Inspector
          </Typography>
          <Typography variant="subtitle1" component="h2" sx={{ m: 0 }}>
            {inspector.title}
          </Typography>
          {inspector.subtitle && (
            <Typography variant="body2" color="text.secondary">
              {inspector.subtitle}
            </Typography>
          )}
        </div>
        <FieldList fields={inspector.fields ?? []} />
        {inspector.emptyHint && (
          <Typography variant="body2" color="text.secondary">
            {inspector.emptyHint}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Workspace context · {pathname || "/"}
        </Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <div>
        <Typography variant="overline" color="text.secondary">
          Inspector
        </Typography>
        <Typography variant="subtitle1" component="h2" sx={{ m: 0 }}>
          Workspace
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Select a row or open a record to inspect properties. Ask ESTI shares
          this slot — switch tabs above (no second AI chrome).
        </Typography>
      </div>
      <FieldList fields={routeFields} />
    </Stack>
  );
}

function FieldList({
  fields,
}: {
  fields: { label: string; value: string }[];
}): ReactNode {
  if (fields.length === 0) return null;
  return (
    <Stack spacing={1} component="dl" sx={{ m: 0 }}>
      {fields.map((f) => (
        <Box key={`${f.label}:${f.value}`} sx={{ m: 0 }}>
          <Typography
            component="dt"
            variant="caption"
            color="text.secondary"
            sx={{ display: "block" }}
          >
            {f.label}
          </Typography>
          <Typography component="dd" variant="body2" sx={{ m: 0 }}>
            {f.value}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
