/**
 * Final account (closing statement) for a package — derived, deterministic, integer paise.
 * Final contract value = original + approved variations. Earned = certified gross. Net certified applies GST and the
 * statutory deductions held on each bill; retention held is released at the end, so the balance due on completion is
 * net certified + retention held − received. `projected` is true while bills are still outstanding or uncertified.
 */
export type FinalAccountBill = {
  status: string; grossPaise: number; gstPaise: number; retentionPaise: number; tdsPaise: number; cessPaise: number; gstTdsPaise: number;
  advanceRecoveryPaise: number; otherDeductionPaise: number; paidPaise: number;
};
export type FinalAccount = {
  originalPaise: number; variationsPaise: number; finalValuePaise: number;
  certifiedGrossPaise: number; uncertifiedPaise: number; netCertifiedPaise: number; retentionHeldPaise: number;
  receivedPaise: number; balanceDuePaise: number; unbilledPaise: number; projected: boolean;
};
const CERTIFIED = new Set(["CERTIFIED", "SENT_TO_CLIENT", "CLOSED"]);

export function computeFinalAccount(originalPaise: number, variationsPaise: number, bills: FinalAccountBill[]): FinalAccount {
  const cert = bills.filter((b) => CERTIFIED.has(b.status));
  const certifiedGrossPaise = cert.reduce((n, b) => n + b.grossPaise, 0);
  const uncertifiedPaise = bills.filter((b) => !CERTIFIED.has(b.status)).reduce((n, b) => n + b.grossPaise, 0);
  const netCertifiedPaise = cert.reduce(
    (n, b) => n + b.grossPaise + b.gstPaise - b.retentionPaise - b.tdsPaise - b.cessPaise - b.gstTdsPaise - b.advanceRecoveryPaise - b.otherDeductionPaise, 0);
  const retentionHeldPaise = cert.reduce((n, b) => n + b.retentionPaise, 0);
  const receivedPaise = bills.reduce((n, b) => n + b.paidPaise, 0);
  const finalValuePaise = originalPaise + variationsPaise;
  const unbilledPaise = Math.max(0, finalValuePaise - certifiedGrossPaise - uncertifiedPaise);
  return {
    originalPaise, variationsPaise, finalValuePaise, certifiedGrossPaise, uncertifiedPaise, netCertifiedPaise, retentionHeldPaise, receivedPaise,
    balanceDuePaise: netCertifiedPaise + retentionHeldPaise - receivedPaise,
    unbilledPaise,
    projected: uncertifiedPaise > 0 || unbilledPaise > 0,
  };
}
