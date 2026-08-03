import { useState } from "react";
import {
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TextInput,
} from "@carbon/react";
import { formatINR } from "@esti/contracts";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataState, StatusDot } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";

/** Cross-vendor rate comparison for one material — cheapest quote per vendor. Wave 3 (Carbon). */
export function VendorRateCompare() {
  const [term, setTerm] = useState("");
  const [material, setMaterial] = useState<string | null>(null);
  const compareQ = trpc.vendors.quotes.compare.useQuery(
    { materialName: material! },
    { enabled: !!material },
  );
  const rows = compareQ.data ?? [];

  return (
    <CarbonScope>
      <Stack gap={5}>
        <h4 className="cds--type-heading-03" style={{ margin: 0 }}>
          Compare vendor rates
        </h4>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <TextInput
              id="vrc-search"
              labelText="Material"
              placeholder="Material name (exact, as quoted) — e.g. OPC 53 cement"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && term.trim()) setMaterial(term.trim());
              }}
            />
          </div>
          <Button onClick={() => term.trim() && setMaterial(term.trim())} disabled={!term.trim()}>
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
            <Table size="sm">
              <TableHead>
                <TableRow>
                  <TableHeader>Vendor</TableHeader>
                  <TableHeader>Quote</TableHeader>
                  <TableHeader>Date</TableHeader>
                  <TableHeader>Unit</TableHeader>
                  <TableHeader>Rate</TableHeader>
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
    </CarbonScope>
  );
}
