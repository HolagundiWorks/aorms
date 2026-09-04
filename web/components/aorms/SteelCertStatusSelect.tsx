"use client";

import { useState, useTransition } from "react";
import { InlineNotification, Select, SelectItem } from "@carbon/react";
import { updateSteelCertStatus } from "../../lib/actions/pmc-steel-certs";

const STATUSES = ["DRAFT", "SITE_CHECKED", "CERTIFIED", "SENT_TO_CLIENT", "CLOSED"];

export function SteelCertStatusSelect({ certId, status }: { certId: string; status: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Select
        id={`steel-cert-status-${certId}`}
        labelText=""
        hideLabel
        size="sm"
        value={status}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          startTransition(async () => {
            const res = await updateSteelCertStatus(certId, next);
            if (res.error) setError(res.error);
          });
        }}
      >
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s} text={s} />
        ))}
      </Select>
      {error && (
        <div style={{ marginTop: "0.25rem" }}>
          <InlineNotification kind="error" title="Could not update" subtitle={error} hideCloseButton lowContrast />
        </div>
      )}
    </div>
  );
}
