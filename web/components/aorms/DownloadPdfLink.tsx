import Link from "next/link";
import { Document } from "@carbon/icons-react";

/**
 * Real download link for in-process-rendered PDFs (2026-09-14
 * remediation) — replaces GeneratePdfButton.tsx's old "Generate PDF"
 * → queue → poll-for-READY → inert "PDF ready" text flow for any target
 * that's been converted to synchronous rendering (see lib/pdf/*.tsx).
 * No status to poll: the PDF renders in the same request as the
 * download, so this is just a link to the Route Handler — plain HTML
 * navigation, not a Server Action, so the browser's own download
 * handling takes over (the route's Content-Disposition header does the
 * rest).
 */
export function DownloadPdfLink({ href, label = "Download PDF" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="cds--type-body-01" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
      <Document size={16} />
      {label}
    </Link>
  );
}
