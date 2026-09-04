import {
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { PageBreadcrumb } from "../components/PageBreadcrumb.js";
import { RailLayout } from "../components/RailLayout.js";
import { SHELL_KEYMAP } from "../lib/keymap.js";
import { AORMS_STUDIO, ESTI } from "../lib/product-nomenclature.js";

/**
 * Keyboard shortcuts Help — LF5 shared keymap surface for desktop + web.
 * Chords come from `lib/keymap.ts` so tooltips and this page stay aligned.
 */
export function HelpPage() {
  return (
    <RailLayout
      title="Keyboard shortcuts"
      description={`Shared shell map for ${AORMS_STUDIO.title} on desktop and web. Canvas-local keys stay on their screens.`}
    >
      <PageBreadcrumb items={[{ label: "Help" }, { label: "Shortcuts" }]} />
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Open this page anytime with Ctrl+/ (⌘/ on Mac). {ESTI.name} opens with
          Alt+A from any staff screen.
        </Typography>
        <TableContainer component={Paper} variant="outlined" sx={{ p: 0 }}>
          <Table size="small" aria-label="Keyboard shortcuts">
            <TableHead>
              <TableRow>
                <TableCell>Action</TableCell>
                <TableCell>Shortcut</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {SHELL_KEYMAP.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{b.label}</TableCell>
                  <TableCell>
                    <Typography
                      component="kbd"
                      variant="body2"
                      sx={{ fontFamily: "ui-monospace, monospace" }}
                    >
                      {[b.chord, ...(b.altChords ?? [])].join(" · ")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {b.description}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Stack>
    </RailLayout>
  );
}
