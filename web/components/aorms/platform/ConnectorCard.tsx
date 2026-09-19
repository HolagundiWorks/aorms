"use client";

import { useState, useTransition } from "react";
import { Button, InlineNotification, Select, SelectItem, Tag, TextInput, Tile, Toggle } from "@carbon/react";
import { TrashCan } from "@carbon/icons-react";
import {
  deleteModelConnector,
  grantConnectorAccess,
  resolveHandleToId,
  revokeConnectorAccess,
  updateModelConnectorEnabled,
} from "../../../lib/actions/ai-model-connectors";

export type ConnectorAccessGrant = {
  id: string;
  scope_type: "studio" | "account";
  label: string; // resolved handle, for display — see page.tsx's own resolution pass
};

export type Connector = {
  id: string;
  name: string;
  kind: string;
  base_url: string;
  api_key_masked: string | null;
  model_name: string;
  enabled: boolean;
  default_for_all: boolean;
  notes: string | null;
  grants: ConnectorAccessGrant[];
};

const KIND_LABEL: Record<string, string> = {
  openai_compatible: "OpenAI-compatible",
  anthropic: "Anthropic",
  ollama: "Ollama",
  device_gateway: "Device gateway",
  custom_http: "Custom HTTP",
};

export function ConnectorCard({ connector }: { connector: Connector }) {
  const [isPending, startTransition] = useTransition();
  const [grantHandle, setGrantHandle] = useState("");
  const [grantScope, setGrantScope] = useState<"studio" | "account">("studio");
  const [grantError, setGrantError] = useState<string | null>(null);

  function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    setGrantError(null);
    startTransition(async () => {
      const resolved = await resolveHandleToId(grantScope, grantHandle);
      if (resolved.error || !resolved.id) {
        setGrantError(resolved.error ?? "Couldn't resolve handle.");
        return;
      }
      const res = await grantConnectorAccess(connector.id, grantScope, resolved.id);
      if (res.error) setGrantError(res.error);
      else setGrantHandle("");
    });
  }

  return (
    <Tile>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="cds--type-heading-compact-01">{connector.name}</span>
            <Tag type="blue" size="sm">
              {KIND_LABEL[connector.kind] ?? connector.kind}
            </Tag>
            {connector.default_for_all && (
              <Tag type="purple" size="sm">
                Default
              </Tag>
            )}
          </div>
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.25rem" }}>
            {connector.base_url} · model: {connector.model_name}
            {connector.api_key_masked ? ` · key: ${connector.api_key_masked}` : " · no key"}
          </p>
          {connector.notes && (
            <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)", marginTop: "0.125rem" }}>
              {connector.notes}
            </p>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
          <Toggle
            id={`connector-enabled-${connector.id}`}
            size="sm"
            labelText=""
            hideLabel
            toggled={connector.enabled}
            disabled={isPending}
            onToggle={(checked: boolean) =>
              startTransition(async () => {
                await updateModelConnectorEnabled(connector.id, checked);
              })
            }
          />
          <Button
            kind="ghost"
            size="sm"
            renderIcon={TrashCan}
            disabled={isPending}
            onClick={() => {
              if (!window.confirm(`Delete connector "${connector.name}"? Every access grant for it is removed too.`)) return;
              startTransition(async () => {
                await deleteModelConnector(connector.id);
              });
            }}
          >
            Delete
          </Button>
        </div>
      </div>

      <div style={{ marginTop: "0.75rem" }}>
        <p className="cds--type-label-01" style={{ color: "var(--cds-text-secondary)", marginBottom: "0.375rem" }}>
          Access grants
        </p>
        {connector.grants.length === 0 ? (
          <p className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>
            {connector.default_for_all ? "None needed — default for everyone." : "No one has explicit access yet."}
          </p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginBottom: "0.5rem" }}>
            {connector.grants.map((g) => (
              <Tag
                key={g.id}
                type={g.scope_type === "studio" ? "teal" : "gray"}
                size="sm"
                filter
                onClose={() =>
                  startTransition(async () => {
                    await revokeConnectorAccess(g.id);
                  })
                }
              >
                {g.label}
              </Tag>
            ))}
          </div>
        )}

        <form onSubmit={handleGrant} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", flexWrap: "wrap" }}>
          <Select
            id={`grant-scope-${connector.id}`}
            labelText="Scope"
            size="sm"
            value={grantScope}
            onChange={(e) => setGrantScope(e.target.value as "studio" | "account")}
            style={{ maxWidth: "9rem" }}
          >
            <SelectItem value="studio" text="Studio" />
            <SelectItem value="account" text="Individual" />
          </Select>
          <TextInput
            id={`grant-handle-${connector.id}`}
            labelText="Handle"
            size="sm"
            placeholder={grantScope === "studio" ? "AORMS-S-XXXX" : "AORMS-U-XXXX"}
            value={grantHandle}
            onChange={(e) => setGrantHandle(e.target.value)}
          />
          <Button type="submit" size="sm" kind="tertiary" disabled={isPending || !grantHandle.trim()}>
            Grant
          </Button>
        </form>
        {grantError && (
          <InlineNotification kind="error" title="Couldn't grant access" subtitle={grantError} lowContrast hideCloseButton style={{ marginTop: "0.5rem" }} />
        )}
      </div>
    </Tile>
  );
}
