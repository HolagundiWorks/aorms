---
title: GST and TDS on professional fees — what most software gets wrong
description: An architect's invoice isn't a generic sales invoice. Getting the GST and TDS treatment wrong is easy when your software doesn't know the difference.
date: 2026-09-10
---

An architecture firm's invoice looks like a normal GST invoice at a glance — a taxable value, 18% GST, a total. The trouble starts once you look closer at how that invoice actually gets paid, and most billing software isn't built to handle the specifics of professional fee income.

## TDS under Section 194J isn't optional to track

When a client (typically a company or another entity required to deduct tax at source) pays a professional fee, they're required to deduct TDS under Section 194J before releasing payment — commonly 10% on the fee component, though the applicable rate depends on the payee's status and the nature of the engagement. That means the amount you actually receive is *less* than the invoice total, and the difference isn't a discrepancy to chase down — it's a credit you claim against your own tax liability, provided the TDS is correctly reflected in your Form 26AS.

Generic invoicing software treats "amount received" as a single number you reconcile by hand. That works until you have a dozen clients deducting TDS at slightly different rates for different reasons, and reconciling which invoice's TDS credit actually landed in your 26AS becomes a monthly chore instead of something the system already knows.

## GST on an advance isn't the same as GST on a final invoice

Architecture billing runs on phase-wise gates — a percentage of the fee against concept design, another against working drawings, and so on. When a client pays an advance ahead of a phase being complete, GST treatment on that advance differs from a straightforward invoice against completed, delivered work. Handle it wrong and you're either over-reporting liability early or under-reporting it later — neither is a place you want your books to be casually approximate.

## Retention, debit notes, and scope changes

Real practice billing isn't just "invoice, get paid." A client may retain a percentage against a phase pending a deliverable review. A scope change mid-project might need a debit note against an earlier invoice rather than a fresh one. None of this is unusual — it's ordinary practice — but it's exactly the kind of detail that generic invoicing tools weren't built to represent cleanly, because they were built for a simpler transaction shape.

## The fix isn't more spreadsheets

The actual fix isn't hiring more bookkeeping hours to reconcile TDS credits and GST timing by hand every month — it's software that understands professional-fee billing as its native model, not a generic invoice template stretched to almost fit. GST-compliant invoicing, TDS tracking, and the phase-wise billing structure underneath it all need to be the same system, referencing the same numbers, not three separate records someone has to keep aligned manually.

*AORMS invoicing is built for exactly this — GST, TDS on professional fees, phase-wise billing gates, and reconciliation, native to the model. [See how it works →](/)*
