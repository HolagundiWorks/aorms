"use client";

import { useState, useTransition } from "react";
import { InlineNotification, Select, SelectItem } from "@carbon/react";
import { updateUserRole } from "../../lib/actions/users";

const ROLES = ["OWNER", "PARTNER", "ACCOUNTANT", "HR_MANAGER", "SENIOR", "ASSOCIATE", "VIEWER", "SITE_SUPERVISOR"];

export function UserRoleSelect({ userId, role }: { userId: string; role: string }) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      <Select
        id={`user-role-${userId}`}
        labelText=""
        hideLabel
        size="sm"
        value={role}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value;
          setError(null);
          startTransition(async () => {
            const res = await updateUserRole(userId, next);
            if (res.error) setError(res.error);
          });
        }}
      >
        {ROLES.map((r) => (
          <SelectItem key={r} value={r} text={r} />
        ))}
      </Select>
      {error && <InlineNotification kind="error" title="Failed" subtitle={error} hideCloseButton lowContrast />}
    </div>
  );
}
