import Link from "next/link";
import { SheetMark } from "./SheetMark";

/**
 * Heading block shared by every sign-in-family page (login, signup, password
 * reset/set, forgot-password, studio picker) so they read as one system with
 * the rest of AORMS: sheet reference rule, logo (these pages have no header, so
 * the logo leads), light-weight title, how-to description (hidden by the
 * Instructions toggle) and an outcome-first "The result" line.
 */
export function AuthHead({ title, description, result }: { title: React.ReactNode; description?: React.ReactNode; result?: string }) {
  return (
    <div>
      <SheetMark />
      <Link href="/" aria-label="AORMS home" style={{ display: "inline-block", marginBottom: "1.5rem" }}>
        {/* Plain <img>, not next/image — a fixed brand asset. */}
        <img src="/aorms-logo.png" alt="AORMS" style={{ height: "28px", width: "auto" }} />
      </Link>
      <h1 className="cds--type-heading-05" style={{ fontWeight: 300 }}>
        {title}
      </h1>
      {description && (
        <p className="cds--type-body-01 aorms-instruction" style={{ marginTop: "0.25rem", color: "var(--cds-text-secondary)" }}>
          {description}
        </p>
      )}
      {result && (
        <p className="aorms-result aorms-instruction">
          <span className="aorms-result__label">The result</span>
          {result}
        </p>
      )}
    </div>
  );
}
