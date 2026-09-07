"use client";

import { useState, useTransition } from "react";
import { InlineNotification, Select, SelectItem } from "@carbon/react";
import { updateCompanyMembershipRole } from "../../../../lib/actions/company";

export function CompanyMembershipRoleSelect({ membershipId, role }: { membershipId: string; role: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Select
        id={`company-membership-role-${membershipId}`}
        labelText="Member role"
        hideLabel
        size="sm"
        value={role}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as "OWNER" | "MEMBER";
          setError(null);
          startTransition(async () => {
            const res = await updateCompanyMembershipRole(membershipId, next);
            if (res.error) setError(res.error);
          });
        }}
      >
        <SelectItem value="MEMBER" text="MEMBER" />
        <SelectItem value="OWNER" text="OWNER" />
      </Select>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
