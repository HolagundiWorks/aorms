"use client";

/**
 * Register a new Esti inference device (2026-09-13). Two-stage UI, not a
 * plain create-and-close form: after `registerAiDevice` succeeds, the
 * panel switches to a "copy this now" reveal of the plaintext secret —
 * it's never retrievable again after this (see lib/actions/ai-devices.ts's
 * own header comment), so closing the panel without copying it means
 * re-registering a fresh device instead of recovering the old one.
 */
import { useState } from "react";
import { Button, InlineNotification, Select, SelectItem, TextInput } from "@carbon/react";
import { registerAiDevice } from "../../../lib/actions/ai-devices";
import { useClosePanel } from "../ContextPanel";

export function RegisterDeviceForm() {
  const close = useClosePanel();
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState("android");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ deviceId: string; secret: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    const res = await registerAiDevice(name, deviceType);
    setIsPending(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setResult(res);
  }

  if (result) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <InlineNotification
          kind="warning"
          title="Copy this secret now"
          subtitle="It's shown once and can't be retrieved again — paste both values into the device's own config before closing this panel."
          hideCloseButton
          lowContrast
        />
        <TextInput id="device-id-out" labelText="Device ID" value={result.deviceId} readOnly />
        <TextInput id="device-secret-out" labelText="Device secret" value={result.secret} readOnly />
        <Button
          kind="secondary"
          size="sm"
          onClick={() => {
            navigator.clipboard
              .writeText(`AORMS_DEVICE_ID=${result.deviceId}\nAORMS_DEVICE_SECRET=${result.secret}\n`)
              .then(() => setCopied(true))
              .catch(() => setCopied(false));
          }}
        >
          {copied ? "Copied" : "Copy both as env lines"}
        </Button>
        <Button onClick={close}>Done</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {error && (
        <InlineNotification kind="error" title="Couldn't register device" subtitle={error} hideCloseButton lowContrast />
      )}
      <TextInput
        id="device-name"
        labelText="Device name"
        placeholder="e.g. Esti M11"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <Select id="device-type" labelText="Device type" value={deviceType} onChange={(e) => setDeviceType(e.target.value)}>
        <SelectItem value="android" text="Android phone" />
        <SelectItem value="server" text="Server" />
        <SelectItem value="other" text="Other" />
      </Select>
      <Button type="submit" disabled={isPending || !name.trim()}>
        {isPending ? "Registering…" : "Register device"}
      </Button>
    </form>
  );
}
