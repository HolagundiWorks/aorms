"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  Button,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { Edit } from "@carbon/icons-react";
import { updateProduct } from "../../../../lib/actions/materials";
import type { PlatformActionState } from "../../../../lib/actions/platform";
import { FormGrid } from "../../FormGrid";
import { RemoveProductButton } from "./RemoveProductButton";
import { ProductSpecRow, type ProductSpec } from "./ProductSpecRow";
import { AddProductSpecForm } from "./AddProductSpecForm";
import { ProductTestResultRow, type ProductTestResult } from "./ProductTestResultRow";
import { AddProductTestResultForm } from "./AddProductTestResultForm";

const CATEGORY_LABELS: Record<string, string> = {
  BUILDING_MATERIAL: "Building material",
  INTERIOR_MATERIAL: "Interior material",
  FINISH: "Finish",
  OTHER: "Other",
};

function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

export type Product = {
  id: string;
  name: string;
  category: string;
  sku: string | null;
  mrp_paise: number | null;
  description: string | null;
  product_specifications: ProductSpec[];
  product_test_results: ProductTestResult[];
};

/**
 * One product's card — owner-only edit-in-place (same toggle pattern as
 * CompanyBoardMemberRow.tsx/CompanyContactRow.tsx) plus, one level
 * deeper, its flexible key-value specs and structured test results
 * (ProductSpecRow.tsx/ProductTestResultRow.tsx — same pattern again).
 */
export function ProductCard({ product, companyId, isOwner }: { product: Product; companyId: string; isOwner: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState<PlatformActionState, FormData>(updateProduct, null);
  const wasPending = useRef(false);

  useEffect(() => {
    if (wasPending.current && !pending && !state?.error) {
      setEditing(false);
    }
    wasPending.current = pending;
  }, [pending, state]);

  return (
    <Tile>
      {editing ? (
        <Form action={formAction}>
          <input type="hidden" name="productId" value={product.id} />
          <input type="hidden" name="companyId" value={companyId} />
          <Stack gap={4}>
            <FormGrid>
              <TextInput id={`edit-product-name-${product.id}`} name="name" labelText="Product name" defaultValue={product.name} required />
              <Select id={`edit-product-category-${product.id}`} name="category" labelText="Category" defaultValue={product.category}>
                <SelectItem value="BUILDING_MATERIAL" text="Building material" />
                <SelectItem value="INTERIOR_MATERIAL" text="Interior material" />
                <SelectItem value="FINISH" text="Finish" />
                <SelectItem value="OTHER" text="Other" />
              </Select>
              <TextInput id={`edit-product-sku-${product.id}`} name="sku" labelText="SKU" defaultValue={product.sku ?? ""} />
              <TextInput
                id={`edit-product-mrp-${product.id}`}
                name="mrpPaise"
                labelText="MRP (₹)"
                defaultValue={product.mrp_paise != null ? String(product.mrp_paise / 100) : ""}
              />
            </FormGrid>
            <TextArea id={`edit-product-description-${product.id}`} name="description" labelText="Description" rows={2} defaultValue={product.description ?? ""} />
            {state?.error ? (
              <InlineNotification kind="error" title="Couldn't save" subtitle={state.error} lowContrast hideCloseButton />
            ) : null}
            <Stack gap={3} orientation="horizontal">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Save"}
              </Button>
              <Button type="button" kind="ghost" size="sm" onClick={() => setEditing(false)} disabled={pending}>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Form>
      ) : (
        <Stack gap={4}>
          <Stack gap={3} orientation="horizontal" style={{ alignItems: "center", justifyContent: "space-between" }}>
            <Stack gap={2} orientation="horizontal" style={{ alignItems: "center" }}>
              <strong className="cds--type-productive-heading-02">{product.name}</strong>
              <Tag type="cool-gray" size="sm">
                {CATEGORY_LABELS[product.category] ?? product.category}
              </Tag>
              {product.sku && (
                <span className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                  SKU: {product.sku}
                </span>
              )}
              {product.mrp_paise != null && (
                <Tag type="green" size="sm">
                  MRP {formatInr(product.mrp_paise)}
                </Tag>
              )}
            </Stack>
            {isOwner && (
              <Stack gap={2} orientation="horizontal">
                <Button kind="ghost" size="sm" hasIconOnly iconDescription={`Edit ${product.name}`} renderIcon={Edit} onClick={() => setEditing(true)} />
                <RemoveProductButton productId={product.id} companyId={companyId} name={product.name} />
              </Stack>
            )}
          </Stack>
          {product.description && <p className="cds--type-body-01">{product.description}</p>}
        </Stack>
      )}

      <Stack gap={5} style={{ marginTop: "1.5rem" }}>
        <div>
          <h4 className="cds--type-productive-heading-01" style={{ marginBottom: "0.5rem" }}>
            Specifications
          </h4>
          <Stack gap={2}>
            {product.product_specifications.map((spec) => (
              <ProductSpecRow key={spec.id} spec={spec} companyId={companyId} isOwner={isOwner} />
            ))}
            {product.product_specifications.length === 0 && (
              <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                No specifications recorded.
              </p>
            )}
          </Stack>
          {isOwner && (
            <div style={{ marginTop: "0.75rem" }}>
              <AddProductSpecForm productId={product.id} companyId={companyId} />
            </div>
          )}
        </div>

        <div>
          <h4 className="cds--type-productive-heading-01" style={{ marginBottom: "0.5rem" }}>
            Test results
          </h4>
          <Table aria-label={`Test results for ${product.name}`} size="sm" className="aorms-table-spaced">
            <TableHead>
              <TableRow>
                <TableHeader>Test</TableHeader>
                <TableHeader>Result</TableHeader>
                <TableHeader>Lab / agency</TableHeader>
                <TableHeader>Tested on</TableHeader>
                {isOwner && <TableHeader>Actions</TableHeader>}
              </TableRow>
            </TableHead>
            <TableBody>
              {product.product_test_results.map((tr) => (
                <ProductTestResultRow key={tr.id} testResult={tr} companyId={companyId} isOwner={isOwner} />
              ))}
              {product.product_test_results.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isOwner ? 5 : 4}>
                    <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
                      No test results recorded.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          {isOwner && (
            <div style={{ marginTop: "0.75rem" }}>
              <AddProductTestResultForm productId={product.id} companyId={companyId} />
            </div>
          )}
        </div>
      </Stack>
    </Tile>
  );
}
