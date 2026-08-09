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
import { AORMS_STUDIO } from "../lib/product-nomenclature.js";

/**
 * Keyboard shortcuts Help — LF5 shell map (Ask ESTI omitted from this SPA).
 */
export function HelpPage() {
  const rows = SHELL_KEYMAP.filter((b) => b.id !== "askEsti");

  return (
    <RailLayout
      title="Keyboard shortcuts"
      description={`Shared shell map for ${AORMS_STUDIO.title}. Canvas-local keys stay on their screens.`}
    >
      <PageBreadcrumb items={[{ label: "Help" }, { label: "Shortcuts" }]} />
      <Stack spacing={2}>
        <Typography variant="body2" color="text.secondary">
          Open this page anytime with Ctrl+/ (⌘/ on Mac).
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
              {rows.map((b) => (
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
