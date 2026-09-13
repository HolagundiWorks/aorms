"use client";

/**
 * SysDeX Accounts — direct BASIC/PRO and admin-role overrides
 * (2026-09-14 audit: "user level basic pro scheme doesn't exist" /
 * "activating user" — there was no admin UI for either at all before
 * this). Plain onClick calls to the two new Server Actions
 * (adminSetAccountLevel/adminSetAccountRole in lib/actions/platform.ts)
 * rather than a <Form>+useActionState — each is a single-field, no-body
 * mutation triggered by choosing a Select option, not a multi-field form
 * with its own submit button.
 */
import { useState, useTransition } from "react";
import { Select, SelectItem, InlineLoading, InlineNotification } from "@carbon/react";
import { adminSetAccountLevel, adminSetAccountRole } from "../../../lib/actions/platform";

export function AccountAdminControls({
  accountId,
  level,
  adminRole,
  isSelf,
}: {
  accountId: string;
  level: string;
  adminRole: "SUPER_ADMIN" | "SUPPORT_STAFF" | null;
  isSelf: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onLevelChange(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await adminSetAccountLevel(accountId, value as "BASIC" | "PRO");
      if (result.error) setError(result.error);
    });
  }

  function onRoleChange(value: string) {
    setError(null);
    const nextRole = value === "NONE" ? null : (value as "SUPER_ADMIN" | "SUPPORT_STAFF");
    startTransition(async () => {
      const result = await adminSetAccountRole(accountId, nextRole);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", minWidth: "9rem" }}>
      <Select
        id={`level-${accountId}`}
        labelText="Level"
        hideLabel
        size="sm"
        defaultValue={level}
        onChange={(e) => onLevelChange(e.target.value)}
        disabled={isPending}
      >
        <SelectItem value="BASIC" text="Basic" />
        <SelectItem value="PRO" text="Pro" />
      </Select>
      <Select
        id={`role-${accountId}`}
        labelText="Admin role"
        hideLabel
        size="sm"
        defaultValue={adminRole ?? "NONE"}
        onChange={(e) => onRoleChange(e.target.value)}
        disabled={isPending || isSelf}
      >
        <SelectItem value="NONE" text="— Not admin —" />
        <SelectItem value="SUPPORT_STAFF" text="Support Staff" />
        <SelectItem value="SUPER_ADMIN" text="Super Admin" />
      </Select>
      {isPending && <InlineLoading description="Saving…" />}
      {error && <InlineNotification kind="error" title="Couldn't save" subtitle={error} hideCloseButton lowContrast />}
      {isSelf && (
        <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
          Can&apos;t change your own admin role.
        </p>
      )}
    </div>
  );
}
