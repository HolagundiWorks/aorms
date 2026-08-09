import { useState } from "react";
import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { formatINR } from "@esti/contracts";
import { DataState, StatusDot } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

/** Cross-vendor rate comparison for one material — cheapest quote per vendor. */
export function VendorRateCompare() {
  const [term, setTerm] = useState("");
  const [material, setMaterial] = useState<string | null>(null);
  const compareQ = trpc.vendors.quotes.compare.useQuery(
    { materialName: material! },
    { enabled: !!material },
  );
  const rows = compareQ.data ?? [];

  return (
    <Stack spacing={2.5}>
      <Typography variant="h6" sx={{ m: 0 }}>
        Compare vendor rates
      </Typography>
      <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
        <TextField
          id="vrc-search"
          label="Material"
          placeholder="Material name (exact, as quoted) — e.g. OPC 53 cement"
          value={term}
          fullWidth
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && term.trim()) setMaterial(term.trim());
          }}
        />
        <Button variant="contained" onClick={() => term.trim() && setMaterial(term.trim())} disabled={!term.trim()}>
          Compare
        </Button>
      </div>

      {material && (
        <DataState
          loading={compareQ.isLoading}
          isEmpty={!compareQ.isLoading && rows.length === 0}
          empty={{ title: "No quotes", description: `No vendor quotes found for “${material}”.` }}
          columnCount={5}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Vendor</TableCell>
                <TableCell>Quote</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell>Rate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.vendorId}>
                  <TableCell>{r.vendorName}</TableCell>
                  <TableCell>{r.quoteRef}</TableCell>
                  <TableCell>{r.quoteDate}</TableCell>
                  <TableCell>{r.unit}</TableCell>
                  <TableCell>
                    {formatINR(r.ratePaise)} {r.isLowest && <StatusDot color="green" label="lowest" />}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataState>
      )}
    </Stack>
  );
}
