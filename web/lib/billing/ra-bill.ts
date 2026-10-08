/**
 * Running-account (RA) bill statement — port of HolagundiWorks/AQC's `AccountsModels.cs` `RunningBill`.
 * Gross = Σ rate × qty; GST is added on top (tax invoice total); retention, TDS u/s 194C, labour cess and
 * GST-TDS are percentages of the gross (taxable value); advance recovery and other deductions are flat.
 * Net payable = invoice total − all deductions. Money is integer paise.
 */

export type RaBillLine = { description: string; unit?: string; ratePaise: number; qty: number };

export type RaBillTerms = {
  retentionPct: number;
  gstPct: number;
  tdsPct: number;
  cessPct: number;
  gstTdsPct: number;
  advanceRecoveryPaise: number;
  otherDeductionsPaise: number;
};

export type RaBillStatement = {
  grossPaise: number;
  gstPaise: number;
  invoicePaise: number;
  retentionPaise: number;
  tdsPaise: number;
  cessPaise: number;
  gstTdsPaise: number;
  advanceRecoveryPaise: number;
  otherDeductionsPaise: number;
  totalDeductionsPaise: number;
  netPaise: number;
};

/** AQC defaults: 5% retention; GST 18, TDS 2 (company), cess 1, GST-TDS 2 are typical new-bill seeds. */
export const DEFAULT_RA_TERMS: RaBillTerms = {
  retentionPct: 5,
  gstPct: 18,
  tdsPct: 2,
  cessPct: 1,
  gstTdsPct: 0,
  advanceRecoveryPaise: 0,
  otherDeductionsPaise: 0,
};

const pct = (base: number, p: number) => Math.round((base * Math.max(0, p)) / 100);

export function lineAmountPaise(l: RaBillLine): number {
  return Math.round(Math.max(0, l.ratePaise) * Math.max(0, l.qty));
}

export function computeRaBill(lines: RaBillLine[], t: RaBillTerms): RaBillStatement {
  const grossPaise = lines.reduce((s, l) => s + lineAmountPaise(l), 0);
  const gstPaise = pct(grossPaise, t.gstPct);
  const invoicePaise = grossPaise + gstPaise;
  const retentionPaise = pct(grossPaise, t.retentionPct);
  const tdsPaise = pct(grossPaise, t.tdsPct);
  const cessPaise = pct(grossPaise, t.cessPct);
  const gstTdsPaise = pct(grossPaise, t.gstTdsPct);
  const advanceRecoveryPaise = Math.max(0, t.advanceRecoveryPaise);
  const otherDeductionsPaise = Math.max(0, t.otherDeductionsPaise);
  const totalDeductionsPaise = retentionPaise + tdsPaise + cessPaise + gstTdsPaise + advanceRecoveryPaise + otherDeductionsPaise;
  return {
    grossPaise,
    gstPaise,
    invoicePaise,
    retentionPaise,
    tdsPaise,
    cessPaise,
    gstTdsPaise,
    advanceRecoveryPaise,
    otherDeductionsPaise,
    totalDeductionsPaise,
    netPaise: invoicePaise - totalDeductionsPaise,
  };
}

/** Financial-year RA number, AQC format `PREFIX/RA/FY/NNN` (FY like "2026-27"). */
export function raBillNumber(prefix: string, fy: string, seq: number): string {
  return `${prefix}/RA/${fy}/${String(seq).padStart(3, "0")}`;
}
