"use client";

import { useState, useTransition } from "react";
import { Button, Tag } from "@carbon/react";
import { TrashCan, Document } from "@carbon/icons-react";
import { removeAccountCertificate } from "../../../lib/actions/account-profile";

export type CertificateRow = {
  id: string;
  kind: "DEGREE" | "SOFTWARE" | "OTHER";
  title: string;
  issuer: string | null;
  issued_on: string | null;
  fileUrl: string | null;
};

const KIND_LABEL: Record<CertificateRow["kind"], string> = {
  DEGREE: "Degree",
  SOFTWARE: "Software certification",
  OTHER: "Other",
};

export function CertificateList({ certificates }: { certificates: CertificateRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  if (certificates.length === 0) {
    return (
      <p className="cds--type-body-01" style={{ color: "var(--cds-text-secondary)" }}>
        No certificates added yet.
      </p>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {certificates.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
            padding: "0.75rem",
            background: "var(--cds-layer-01)",
            border: "1px solid var(--cds-border-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", minWidth: 0 }}>
            <Tag type={c.kind === "DEGREE" ? "purple" : c.kind === "SOFTWARE" ? "blue" : "gray"} size="sm">
              {KIND_LABEL[c.kind]}
            </Tag>
            <div style={{ minWidth: 0 }}>
              <p className="cds--type-body-compact-01" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <strong>{c.title}</strong>
                {c.issuer ? ` — ${c.issuer}` : ""}
              </p>
              {c.issued_on && (
                <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
                  Issued {c.issued_on}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {c.fileUrl && (
              <Button kind="ghost" size="sm" renderIcon={Document} href={c.fileUrl} target="_blank" rel="noopener noreferrer">
                View
              </Button>
            )}
            <Button
              kind="ghost"
              size="sm"
              renderIcon={TrashCan}
              disabled={isPending && removingId === c.id}
              onClick={() => {
                if (!window.confirm(`Remove "${c.title}"?`)) return;
                setRemovingId(c.id);
                startTransition(async () => {
                  await removeAccountCertificate(c.id);
                });
              }}
            >
              {isPending && removingId === c.id ? "Removing…" : "Remove"}
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
