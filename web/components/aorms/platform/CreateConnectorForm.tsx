"use client";

import { useActionState } from "react";
import { Button, Checkbox, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createModelConnector, type ActionResult } from "../../../lib/actions/ai-model-connectors";

/**
 * Registers a new Esti model connector — generic across providers
 * (migration 0020_ai_model_connectors.sql's own header comment explains
 * why `kind` + base_url + api_key + model_name is enough to describe an
 * OpenAI-compatible endpoint, Anthropic, Ollama, or this repo's own
 * device-gateway uniformly). A fresh connector starts with no access
 * grants and `default_for_all` off — genuinely opt-in, not usable by any
 * Studio/account until explicitly granted (or flipped to default).
 */
export function CreateConnectorForm() {
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(createModelConnector, null);

  return (
    <Form action={formAction}>
      <Stack gap={4}>
        <TextInput id="connector-name" name="name" labelText="Name" placeholder="e.g. OpenAI GPT-4o-mini" required />
        <Select id="connector-kind" name="kind" labelText="Kind" defaultValue="openai_compatible">
          <SelectItem value="openai_compatible" text="OpenAI-compatible (chat completions)" />
          <SelectItem value="anthropic" text="Anthropic (Messages API)" />
          <SelectItem value="ollama" text="Ollama" />
          <SelectItem value="device_gateway" text="Esti device gateway (mobile/edge inference)" />
          <SelectItem value="custom_http" text="Custom HTTP (OpenAI-compatible shape assumed)" />
        </Select>
        <TextInput
          id="connector-base-url"
          name="baseUrl"
          labelText="Base URL"
          placeholder="https://api.openai.com/v1"
          required
        />
        <TextInput id="connector-api-key" name="apiKey" labelText="API key / bearer token (optional)" type="password" />
        <TextInput id="connector-model" name="modelName" labelText="Model name" placeholder="gpt-4o-mini" required />
        <Checkbox id="connector-default" name="defaultForAll" labelText="Default for every Studio/account with no explicit grant" />
        <TextArea id="connector-notes" name="notes" labelText="Notes (optional)" rows={2} />
        {state?.error ? <InlineNotification kind="error" title="Couldn't create connector" subtitle={state.error} lowContrast hideCloseButton /> : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create connector"}
        </Button>
      </Stack>
    </Form>
  );
}
