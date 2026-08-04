import {
  InlineNotification,
  Modal,
  NumberInput,
  Select,
  SelectItem,
  Stack,
  TextArea,
  TextInput,
} from "@carbon/react";
import { Add } from "@carbon/icons-react";
import {
  VENDOR_CATEGORIES,
  VendorCategory,
  formatINR,
  vendorScore,
  type VendorCategoryCode,
} from "@esti/contracts";
import { useState } from "react";
import { useScreenActions } from "@hcw/ui-kit";
import { CarbonScope } from "../carbon/CarbonScope.js";
import {
  ConfirmModal,
  DataGrid,
  DataState,
  PageBreadcrumb,
  StatusDot,
  type GridColDef,
} from "../carbon/adapters/index.js";
import { RailLayout } from "../components/RailLayout.js";
import { RowActionsMenu } from "../components/RowActionsMenu.js";
import { VendorQuotes } from "../components/vendor/VendorQuotes.js";
import { VendorRateCompare } from "../components/vendor/VendorRateCompare.js";
import { trpc } from "../lib/trpc.js";

type FormState = {
  id?: string;
  name: string; category: VendorCategoryCode;
  companyName: string; contactPerson: string;
  gstin: string; pan: string; email: string; phone: string; city: string; state: string;
};

const EMPTY: FormState = {
  name: "", category: "CEMENT", companyName: "", contactPerson: "",
  gstin: "", pan: "", email: "", phone: "", city: "", state: "",
};

const EMPTY_PRICE = {
  materialName: "", unit: "", rateRupees: 0,
  effectiveDate: new Date().toISOString().slice(0, 10),
  source: "MANUAL" as "QUOTE" | "INVOICE" | "MANUAL",
  notes: "",
};

function scoreTag(score: number): "green" | "teal" | "blue" | "gray" {
  if (score >= 4.5) return "green";
  if (score >= 3.5) return "teal";
  if (score > 0) return "blue";
  return "gray";
}

const SUBTEXT: React.CSSProperties = { margin: 0, color: "var(--cds-text-secondary)" };

export function Vendors() {
  const utils = trpc.useUtils();
  const [category, setCategory] = useState("");
  const listQ = trpc.vendors.list.useQuery({
    category: category ? (category as VendorCategoryCode) : undefined,
  });
  const rows = listQ.data ?? [];

  const invalidate = () => utils.vendors.list.invalidate();
  const [form, setForm] = useState<FormState | null>(null);
  const [rating, setRating] = useState<{ id: string; name: string; quality: string; reliability: string; pricing: string; notes: string } | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [priceForm, setPriceForm] = useState<typeof EMPTY_PRICE | null>(null);
  const [confirmPriceId, setConfirmPriceId] = useState<string | null>(null);

  const create = trpc.vendors.create.useMutation({ meta: { errorTitle: "Couldn't create the vendor" }, onSuccess: () => { invalidate(); setForm(null); } });
  const update = trpc.vendors.update.useMutation({ meta: { errorTitle: "Couldn't update the vendor" }, onSuccess: () => { invalidate(); setForm(null); } });
  const setRatingM = trpc.vendors.setRating.useMutation({ meta: { errorTitle: "Couldn't save the vendor rating" }, onSuccess: () => { invalidate(); setRating(null); } });
  const remove = trpc.vendors.remove.useMutation({ meta: { errorTitle: "Couldn't delete the vendor" }, onSuccess: () => { invalidate(); setSelectedId(null); } });

  const pricesQ = trpc.vendors.pricesByVendor.useQuery(
    { vendorId: selectedId! },
    { enabled: !!selectedId },
  );
  const addPrice = trpc.vendors.addPrice.useMutation({
    meta: { errorTitle: "Couldn't add the vendor price" },
    onSuccess: () => { void pricesQ.refetch(); setPriceForm(null); },
  });
  const removePrice = trpc.vendors.removePrice.useMutation({ meta: { errorTitle: "Couldn't delete the vendor price" }, onSuccess: () => void pricesQ.refetch() });

  const saving = create.isPending || update.isPending;
  const err = create.error || update.error;
  const selected = rows.find((v) => v.id === selectedId);

  useScreenActions(
    form !== null || rating !== null || priceForm !== null
      ? []
      : [
          {
            id: "new-vendor",
            zone: "center",
            tone: "primary",
            label: "New vendor",
            icon: <Add />,
            onClick: () => setForm({ ...EMPTY }),
          },
          ...(selected
            ? [
                {
                  id: "add-price",
                  zone: "center" as const,
                  label: "Add price",
                  icon: <Add />,
                  onClick: () => setPriceForm({ ...EMPTY_PRICE }),
                },
              ]
            : []),
        ],
    [form, rating, priceForm, selected],
  );

  const submit = () => {
    if (!form) return;
    const payload = {
      name: form.name, category: form.category,
      companyName: form.companyName || undefined, contactPerson: form.contactPerson || undefined,
      gstin: form.gstin || undefined, pan: form.pan || undefined,
      email: form.email || undefined, phone: form.phone || undefined,
      city: form.city || undefined, state: form.state || undefined,
    };
    if (form.id) update.mutate({ id: form.id, ...payload });
    else create.mutate(payload);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1.3,
      minWidth: 180,
      renderCell: (p) => {
        const v = p.row;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0.25rem 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>{v.name}</span>
              {!v.active && <StatusDot color="gray" label="Inactive" />}
            </div>
            {v.companyName && <span className="cds--type-label-01" style={SUBTEXT}>{v.companyName}</span>}
            {(v.city || v.state) && (
              <span className="cds--type-label-01" style={SUBTEXT}>
                {[v.city, v.state].filter(Boolean).join(", ")}
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: "category",
      headerName: "Category",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => VENDOR_CATEGORIES[row.category as VendorCategoryCode] ?? row.category,
    },
    {
      field: "contact",
      headerName: "Contact",
      flex: 1.2,
      minWidth: 170,
      sortable: false,
      renderCell: (p) => {
        const v = p.row;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0.25rem 0" }}>
            <span>{v.contactPerson ?? "—"}</span>
            {v.phone && <span className="cds--type-label-01" style={SUBTEXT}>{v.phone}</span>}
            {v.email && <span className="cds--type-label-01" style={SUBTEXT}>{v.email}</span>}
          </div>
        );
      },
    },
    {
      field: "gstinPan",
      headerName: "GSTIN / PAN",
      flex: 1.1,
      minWidth: 160,
      sortable: false,
      renderCell: (p) => {
        const v = p.row;
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 2, padding: "0.25rem 0" }}>
            <span>{v.gstin ?? "—"}</span>
            {v.pan && <span className="cds--type-label-01" style={SUBTEXT}>{v.pan}</span>}
          </div>
        );
      },
    },
    {
      field: "rating",
      headerName: "Rating",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      renderCell: (p) => {
        const score = vendorScore(p.row);
        return score > 0 ? (
          <StatusDot color={scoreTag(score)} label={`${score.toFixed(1)} / 5`} />
        ) : (
          <StatusDot color="gray" label="Unrated" />
        );
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1.2,
      minWidth: 220,
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const v = p.row;
        return (
          <RowActionsMenu
            actions={[
              {
                label: "Edit",
                onClick: () =>
                  setForm({
                    id: v.id, name: v.name, category: v.category as VendorCategoryCode,
                    companyName: v.companyName ?? "", contactPerson: v.contactPerson ?? "",
                    gstin: v.gstin ?? "", pan: v.pan ?? "", email: v.email ?? "", phone: v.phone ?? "",
                    city: v.city ?? "", state: v.state ?? "",
                  }),
              },
              {
                label: "Rate",
                onClick: () =>
                  setRating({
                    id: v.id, name: v.name,
                    quality: v.qualityRating ? String(v.qualityRating) : "",
                    reliability: v.reliabilityRating ? String(v.reliabilityRating) : "",
                    pricing: v.pricingRating ? String(v.pricingRating) : "",
                    notes: v.notes ?? "",
                  }),
              },
              { label: "Remove", onClick: () => setConfirmId(v.id), danger: true },
            ]}
          />
        );
      },
    },
  ];

  const priceColumns: GridColDef[] = [
    { field: "materialName", headerName: "Material", flex: 1.3, minWidth: 180 },
    { field: "unit", headerName: "Unit", flex: 0.6, minWidth: 90 },
    {
      field: "ratePaise",
      headerName: "Rate",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => formatINR(p.row.ratePaise),
    },
    { field: "effectiveDate", headerName: "Effective", flex: 0.8, minWidth: 120 },
    {
      field: "source",
      headerName: "Source",
      flex: 0.7,
      minWidth: 110,
      sortable: false,
      renderCell: (p) => <StatusDot color="cool-gray" label={p.row.source} />,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.5,
      minWidth: 90,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <RowActionsMenu
          actions={[
            { label: "Remove", onClick: () => setConfirmPriceId(p.row.id), danger: true },
          ]}
        />
      ),
    },
  ];

  return (
    <>
      <RailLayout
        title="Vendors"
        description="Material supplier directory — categories, statutory ids, ratings and pricing history."
        aside={
          <CarbonScope>
            <Select
              id="vn-cat"
              labelText="Category"
              size="sm"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <SelectItem value="" text="All categories" />
              {VendorCategory.options.map((c) => (
                <SelectItem key={c} value={c} text={VENDOR_CATEGORIES[c]} />
              ))}
            </Select>
          </CarbonScope>
        }
      >
      <PageBreadcrumb items={[{ label: "Third Parties" }, { label: "Vendors" }]} />
      <CarbonScope>
        <Stack gap={5}>
          {listQ.error && (
            <InlineNotification kind="error" lowContrast hideCloseButton title="Could not load vendors" subtitle={listQ.error.message} />
          )}

          <DataState
            loading={listQ.isLoading}
            isEmpty={rows.length === 0}
            columnCount={6}
            empty={{ title: "No vendors yet", description: "Add a material supplier to track contacts, ratings and pricing." }}
          >
            <DataGrid
              rows={rows}
              columns={columns}
              density="compact"
              getRowHeight={() => "auto"}
              disableRowSelectionOnClick
              hideFooter
              autoHeight
              onRowClick={(params) => setSelectedId(selectedId === params.id ? null : (params.id as string))}
            />
          </DataState>

          {/* Pricing history for the selected vendor */}
          {selected && (
            <Stack gap={4}>
              <h4 className="cds--type-heading-03" style={{ margin: 0 }}>{selected.name} — Pricing history</h4>
              <DataState
                loading={pricesQ.isLoading}
                isEmpty={!pricesQ.isLoading && (pricesQ.data?.length ?? 0) === 0}
                empty={{ title: "No price records", description: "Record a quoted or invoiced rate for a material from this vendor." }}
                columnCount={6}
              >
                <DataGrid
                  rows={pricesQ.data ?? []}
                  columns={priceColumns}
                  density="compact"
                  disableRowSelectionOnClick
                  hideFooter
                  autoHeight
                />
              </DataState>

              <VendorQuotes vendorId={selected.id} />
            </Stack>
          )}

          <VendorRateCompare />
        </Stack>
      </CarbonScope>
      </RailLayout>

      <CarbonScope>
        {/* create / edit vendor */}
        <Modal
          open={form !== null}
          size="sm"
          modalHeading={form?.id ? "Edit vendor" : "New vendor"}
          primaryButtonText={saving ? "Saving…" : form?.id ? "Save" : "Create"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={!form?.name || saving}
          onRequestClose={() => setForm(null)}
          onRequestSubmit={submit}
        >
          {form && (
            <Stack gap={5}>
              <TextInput id="vn-name" labelText="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Select id="vn-fcat" labelText="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as VendorCategoryCode })}>
                {VendorCategory.options.map((c) => <SelectItem key={c} value={c} text={VENDOR_CATEGORIES[c]} />)}
              </Select>
              <TextInput id="vn-company" labelText="Company (optional)" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
              <div style={{ display: "flex", gap: "1rem" }}>
                <TextInput id="vn-contact" labelText="Contact person" value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} />
                <TextInput id="vn-phone" labelText="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <TextInput id="vn-email" labelText="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <div style={{ display: "flex", gap: "1rem" }}>
                <TextInput id="vn-gstin" labelText="GSTIN" value={form.gstin} onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
                <TextInput id="vn-pan" labelText="PAN" value={form.pan} onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })} />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <TextInput id="vn-city" labelText="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                <TextInput id="vn-state" labelText="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              {err && (
                <InlineNotification kind="error" lowContrast hideCloseButton title="Could not save" subtitle={err.message} />
              )}
            </Stack>
          )}
        </Modal>

        {/* rating */}
        <Modal
          open={rating !== null}
          size="sm"
          modalHeading={rating ? `Rate — ${rating.name}` : "Rate"}
          primaryButtonText={setRatingM.isPending ? "Saving…" : "Save rating"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={setRatingM.isPending}
          onRequestClose={() => setRating(null)}
          onRequestSubmit={() => rating && setRatingM.mutate({
            id: rating.id,
            qualityRating: rating.quality ? Number(rating.quality) : undefined,
            reliabilityRating: rating.reliability ? Number(rating.reliability) : undefined,
            pricingRating: rating.pricing ? Number(rating.pricing) : undefined,
            notes: rating.notes || undefined,
          })}
        >
          {rating && (
            <Stack gap={5}>
              {([["quality", "Quality"], ["reliability", "Reliability"], ["pricing", "Pricing"]] as const).map(([k, label]) => (
                <Select key={k} id={`vn-r-${k}`} labelText={label} value={rating[k]}
                  onChange={(e) => setRating({ ...rating, [k]: e.target.value })}>
                  <SelectItem value="" text="— not rated —" />
                  {[5, 4, 3, 2, 1].map((n) => <SelectItem key={n} value={String(n)} text={`${n} / 5`} />)}
                </Select>
              ))}
              <TextArea id="vn-r-notes" labelText="Notes (optional)" rows={3} value={rating.notes}
                onChange={(e) => setRating({ ...rating, notes: e.target.value })} />
              {setRatingM.error && (
                <InlineNotification kind="error" lowContrast hideCloseButton title="Could not save" subtitle={setRatingM.error.message} />
              )}
            </Stack>
          )}
        </Modal>

        {/* add price */}
        <Modal
          open={priceForm !== null}
          size="sm"
          modalHeading={`Add price${selected ? ` — ${selected.name}` : ""}`}
          primaryButtonText={addPrice.isPending ? "Saving…" : "Add"}
          secondaryButtonText="Cancel"
          primaryButtonDisabled={addPrice.isPending || !priceForm?.materialName || !priceForm?.unit || (priceForm?.rateRupees ?? 0) <= 0}
          onRequestClose={() => setPriceForm(null)}
          onRequestSubmit={() => {
            if (!priceForm || !selectedId) return;
            addPrice.mutate({
              vendorId: selectedId,
              materialName: priceForm.materialName,
              unit: priceForm.unit,
              ratePaise: Math.round(priceForm.rateRupees * 100),
              effectiveDate: priceForm.effectiveDate,
              source: priceForm.source,
              notes: priceForm.notes || undefined,
            });
          }}
        >
          {priceForm && (
            <Stack gap={5}>
              <TextInput id="vp-mat" labelText="Material" placeholder="OPC 53 grade cement" value={priceForm.materialName}
                onChange={(e) => setPriceForm({ ...priceForm, materialName: e.target.value })} />
              <div style={{ display: "flex", gap: "1rem" }}>
                <TextInput id="vp-unit" labelText="Unit" placeholder="bag" value={priceForm.unit}
                  onChange={(e) => setPriceForm({ ...priceForm, unit: e.target.value })} />
                <NumberInput id="vp-rate" label="Rate (₹)" min={0} step={0.5} value={priceForm.rateRupees}
                  onChange={(_e, { value }) => setPriceForm({ ...priceForm, rateRupees: Number(value) || 0 })} />
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <TextInput id="vp-date" labelText="Effective date" type="date" value={priceForm.effectiveDate}
                  onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} />
                <Select id="vp-src" labelText="Source" value={priceForm.source}
                  onChange={(e) => setPriceForm({ ...priceForm, source: e.target.value as "QUOTE" | "INVOICE" | "MANUAL" })}>
                  <SelectItem value="MANUAL" text="Manual" />
                  <SelectItem value="QUOTE" text="Quote" />
                  <SelectItem value="INVOICE" text="Invoice" />
                </Select>
              </div>
              <TextInput id="vp-notes" labelText="Notes (optional)" value={priceForm.notes}
                onChange={(e) => setPriceForm({ ...priceForm, notes: e.target.value })} />
              {addPrice.error && (
                <InlineNotification kind="error" lowContrast hideCloseButton title="Could not save" subtitle={addPrice.error.message} />
              )}
            </Stack>
          )}
        </Modal>
      </CarbonScope>

      <ConfirmModal
        open={!!confirmId} heading="Remove vendor?" body="This permanently removes the vendor and all its price records."
        confirmText="Remove" pending={remove.isPending}
        onConfirm={() => { if (confirmId) remove.mutate({ id: confirmId }); setConfirmId(null); }}
        onClose={() => setConfirmId(null)}
      />
      <ConfirmModal
        open={!!confirmPriceId} heading="Remove price record?" body="This removes the price record from the vendor's history."
        confirmText="Remove" pending={removePrice.isPending}
        onConfirm={() => { if (confirmPriceId) removePrice.mutate({ id: confirmPriceId }); setConfirmPriceId(null); }}
        onClose={() => setConfirmPriceId(null)}
      />
    </>
  );
}
