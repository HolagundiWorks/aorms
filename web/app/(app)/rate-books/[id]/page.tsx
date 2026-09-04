import { notFound } from "next/navigation";
import {
  Column,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@carbon/react";
import { createClient } from "../../../../lib/supabase/server";
import { NewRateBookItemForm } from "../../../../components/aorms/NewRateBookItemForm";

function formatInr(paise: number | null): string {
  if (paise == null) return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export default async function RateBookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: rateBook, error: rbError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("rate_books").select("id, name, version_label, description").eq("id", id).maybeSingle(),
    supabase
      .from("rate_book_items")
      .select("id, item_code, description, unit, rate_paise")
      .eq("rate_book_id", id)
      .order("sort_order"),
  ]);

  if (rbError) {
    return (
      <Grid style={{ padding: "2rem" }}>
        <Column sm={4} md={8} lg={16}>
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load rate book: {rbError.message}
          </p>
        </Column>
      </Grid>
    );
  }

  if (!rateBook) notFound();

  return (
    <Grid style={{ padding: "2rem" }}>
      <Column sm={4} md={8} lg={16}>
        <h1 className="cds--type-heading-05" style={{ marginBottom: "0.5rem" }}>
          {rateBook.name}
        </h1>
        <p
          className="cds--type-body-01"
          style={{ marginBottom: "2rem", color: "var(--cds-text-secondary)" }}
        >
          {rateBook.version_label ?? "—"} {rateBook.description ? `· ${rateBook.description}` : ""}
        </p>

        <h2 className="cds--type-heading-03" style={{ marginBottom: "1rem" }}>
          Items
        </h2>

        <NewRateBookItemForm rateBookId={rateBook.id} />

        {itemsError ? (
          <p className="cds--type-body-01" style={{ color: "var(--cds-support-error)" }}>
            Couldn&apos;t load items: {itemsError.message}
          </p>
        ) : (
          <Table aria-label="Rate book items" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Code</TableHeader>
                <TableHeader>Description</TableHeader>
                <TableHeader>Unit</TableHeader>
                <TableHeader>Rate</TableHeader>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items ?? []).map((it) => (
                <TableRow key={it.id}>
                  <TableCell>{it.item_code ?? "—"}</TableCell>
                  <TableCell>{it.description}</TableCell>
                  <TableCell>{it.unit}</TableCell>
                  <TableCell>{formatInr(it.rate_paise)}</TableCell>
                </TableRow>
              ))}
              {(items ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No items yet.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Column>
    </Grid>
  );
}
