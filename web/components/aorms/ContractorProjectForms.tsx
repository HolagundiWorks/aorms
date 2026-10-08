"use client";

import { useActionState, useState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import {
  postContractorMessage,
  raiseContractorSubmission,
  submitRaBill,
  type ContractorProjectActionState,
} from "../../lib/actions/contractor-project";
import { FormGrid } from "./FormGrid";
import { computeRaBill } from "../../lib/billing/ra-bill";

function Notice({ state }: { state: ContractorProjectActionState }) {
  if (!state) return null;
  return "error" in state ? (
    <InlineNotification kind="error" title="Could not send" subtitle={state.error} hideCloseButton lowContrast />
  ) : (
    <InlineNotification kind="success" title={state.ok} hideCloseButton lowContrast />
  );
}

/** Raise a ticket, request a meeting, ask an RFI, post a progress update or send a note — one form, one inbox at the studio. */
export function ContractorRaiseForm({ projectId, defaultKind = "TICKET" }: { projectId: string; defaultKind?: string }) {
  const [state, action, pending] = useActionState(raiseContractorSubmission, null);
  return (
    <Form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={4}>
        <Notice state={state} />
        <FormGrid>
          <Select id={`kind-${defaultKind}`} name="kind" labelText="What are you sending?" defaultValue={defaultKind}>
            <SelectItem value="TICKET" text="Raise a ticket (site issue or clash)" />
            <SelectItem value="MEETING_REQUEST" text="Request a meeting" />
            <SelectItem value="RFI" text="Request for information (RFI)" />
            <SelectItem value="PROGRESS_UPDATE" text="Progress update" />
            <SelectItem value="NOTE" text="Other communication" />
          </Select>
          <TextInput id={`subject-${defaultKind}`} name="subject" labelText="Subject" required maxLength={200} />
        </FormGrid>
        <TextInput id={`pref-${defaultKind}`} name="preferredDate" labelText="Preferred meeting date (meeting requests)" type="date" />
        <TextArea id={`body-${defaultKind}`} name="body" labelText="Details" rows={3} maxLength={4000} />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Send to the studio"}
        </Button>
      </Stack>
    </Form>
  );
}

export function ContractorMessageForm({ submissionId, projectId }: { submissionId: string; projectId: string }) {
  const [state, action, pending] = useActionState(postContractorMessage, null);
  return (
    <Form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={3}>
        <Notice state={state} />
        <TextArea id={`msg-${submissionId}`} name="body" labelText="Reply" rows={2} maxLength={2000} required />
        <Button type="submit" kind="tertiary" size="sm" disabled={pending}>
          {pending ? "Sending…" : "Reply"}
        </Button>
      </Stack>
    </Form>
  );
}

/** Submit a running (RA) bill against an awarded package; the studio site-checks and certifies it. */
type LineDraft = { description: string; unit: string; previousQty: string; thisQty: string; rate: string };
const EMPTY_LINE: LineDraft = { description: "", unit: "", previousQty: "0", thisQty: "", rate: "" };
const rupees = (paise: number) => (paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Running bill from measurement lines (previous / this-bill qty × rate) with AQC's statutory deductions and a live net-payable statement. */
export function ContractorRaBillForm({ projectId, packageId, nextBillNo }: { projectId: string; packageId: string; nextBillNo: string }) {
  const [state, action, pending] = useActionState(submitRaBill, null);
  const [lines, setLines] = useState<LineDraft[]>([{ ...EMPTY_LINE }]);
  const [terms, setTerms] = useState({ retentionPct: "5", gstPct: "18", tdsPct: "2", cessPct: "1", gstTdsPct: "0", advance: "0", other: "0" });
  const num = (v: string) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : 0);
  const billLines = lines.map((l) => ({ description: l.description, unit: l.unit, ratePaise: Math.round(num(l.rate) * 100), qty: num(l.thisQty) }));
  const st = computeRaBill(billLines, {
    retentionPct: num(terms.retentionPct), gstPct: num(terms.gstPct), tdsPct: num(terms.tdsPct), cessPct: num(terms.cessPct), gstTdsPct: num(terms.gstTdsPct),
    advanceRecoveryPaise: Math.round(num(terms.advance) * 100), otherDeductionsPaise: Math.round(num(terms.other) * 100),
  });
  const payload = JSON.stringify(
    lines.filter((l) => l.description.trim() && num(l.thisQty) > 0).map((l) => ({
      description: l.description.trim(), unit: l.unit.trim(), previous_qty: num(l.previousQty), this_qty: num(l.thisQty), rate_paise: Math.round(num(l.rate) * 100),
    })),
  );
  const termsPayload = JSON.stringify({
    retention_pct: num(terms.retentionPct), gst_pct: num(terms.gstPct), tds_pct: num(terms.tdsPct), cess_pct: num(terms.cessPct), gst_tds_pct: num(terms.gstTdsPct),
    advance_recovery_paise: Math.round(num(terms.advance) * 100),
  });
  const setLine = (i: number, patch: Partial<LineDraft>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const setTerm = (k: keyof typeof terms) => (e: React.ChangeEvent<HTMLInputElement>) => setTerms((t) => ({ ...t, [k]: e.target.value }));
  return (
    <Form action={action}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="packageId" value={packageId} />
      <input type="hidden" name="lines" value={payload} />
      <input type="hidden" name="terms" value={termsPayload} />
      <Stack gap={4}>
        <Notice state={state} />
        <FormGrid>
          <TextInput id="ra-billno" name="billNo" labelText="Bill number" defaultValue={nextBillNo} required />
          <TextInput id="ra-start" name="periodStart" labelText="Period from" type="date" required />
          <TextInput id="ra-end" name="periodEnd" labelText="Period to" type="date" required />
        </FormGrid>
        <p className="cds--label">Measurement lines</p>
        {lines.map((l, i) => (
          <FormGrid key={i}>
            <TextInput id={`ra-d-${i}`} labelText="Item" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <TextInput id={`ra-u-${i}`} labelText="Unit" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
            <TextInput id={`ra-p-${i}`} labelText="Previous qty" inputMode="decimal" value={l.previousQty} onChange={(e) => setLine(i, { previousQty: e.target.value })} />
            <TextInput id={`ra-q-${i}`} labelText="This bill qty" inputMode="decimal" value={l.thisQty} onChange={(e) => setLine(i, { thisQty: e.target.value })} />
            <TextInput id={`ra-r-${i}`} labelText="Rate (₹)" inputMode="decimal" value={l.rate} onChange={(e) => setLine(i, { rate: e.target.value })} />
          </FormGrid>
        ))}
        <div>
          <Button kind="tertiary" size="sm" type="button" onClick={() => setLines((ls) => (ls.length < 200 ? [...ls, { ...EMPTY_LINE }] : ls))}>Add line</Button>
          {lines.length > 1 && (
            <Button kind="ghost" size="sm" type="button" onClick={() => setLines((ls) => ls.slice(0, -1))}>Remove last</Button>
          )}
        </div>
        <FormGrid>
          <TextInput id="ra-ret" labelText="Retention %" inputMode="decimal" value={terms.retentionPct} onChange={setTerm("retentionPct")} />
          <TextInput id="ra-gst" labelText="GST % (added)" inputMode="decimal" value={terms.gstPct} onChange={setTerm("gstPct")} />
          <TextInput id="ra-tds" labelText="TDS % (194C)" inputMode="decimal" value={terms.tdsPct} onChange={setTerm("tdsPct")} />
          <TextInput id="ra-cess" labelText="Labour cess %" inputMode="decimal" value={terms.cessPct} onChange={setTerm("cessPct")} />
          <TextInput id="ra-gtds" labelText="GST-TDS %" inputMode="decimal" value={terms.gstTdsPct} onChange={setTerm("gstTdsPct")} />
          <TextInput id="ra-adv" labelText="Advance recovery (₹)" inputMode="decimal" value={terms.advance} onChange={setTerm("advance")} />
        </FormGrid>
        <table className="aorms-table-spaced" aria-label="Bill statement">
          <tbody>
            <tr><td>Gross (taxable value)</td><td style={{ textAlign: "right" }}>₹ {rupees(st.grossPaise)}</td></tr>
            <tr><td>+ GST</td><td style={{ textAlign: "right" }}>₹ {rupees(st.gstPaise)}</td></tr>
            <tr><td>Invoice total</td><td style={{ textAlign: "right" }}>₹ {rupees(st.invoicePaise)}</td></tr>
            <tr><td>− Retention, TDS, cess, GST-TDS, advance</td><td style={{ textAlign: "right" }}>₹ {rupees(st.totalDeductionsPaise)}</td></tr>
            <tr><td><strong>Net payable</strong></td><td style={{ textAlign: "right" }}><strong>₹ {rupees(st.netPaise)}</strong></td></tr>
          </tbody>
        </table>
        <TextArea id="ra-narrative" name="narrative" labelText="Work covered" rows={3} maxLength={2000} />
        <Button type="submit" size="sm" disabled={pending || st.grossPaise <= 0}>
          {pending ? "Submitting…" : "Submit running bill"}
        </Button>
      </Stack>
    </Form>
  );
}
