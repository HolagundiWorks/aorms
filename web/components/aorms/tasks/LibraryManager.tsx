"use client";

import { useActionState, useState, useTransition } from "react";
import { Button, InlineNotification, Select, SelectItem, Stack, Tag, TextInput } from "@carbon/react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@carbon/react";
import { deleteTaskTemplate, saveTaskTemplate, loadStarterLibrary, type LibraryActionState } from "../../../lib/actions/task-library";
import type { TaskTemplate } from "../../../lib/tasks/estimate";

const AREA_LABEL: Record<string, string> = { FLOOR: "Floor area", BUILT_UP: "Built-up area", SITE: "Site area", NONE: "Fixed" };
const initial: LibraryActionState = null;

export function LibraryManager({ templates, canWrite }: { templates: TaskTemplate[]; canWrite: boolean }) {
  const [editing, setEditing] = useState<TaskTemplate | null>(null);
  const [state, action, pending] = useActionState(saveTaskTemplate, initial);
  const [scope, setScope] = useState("PROJECT");
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const edit = (t: TaskTemplate | null) => {
    setEditing(t);
    setScope(t?.scope ?? "PROJECT");
  };

  return (
    <Stack gap={6}>
      {message && <InlineNotification kind="info" lowContrast title={message} onCloseButtonClick={() => setMessage(null)} />}
      {canWrite && templates.length === 0 && (
        <Button
          disabled={busy}
          onClick={() =>
            startTransition(async () => {
              const r = await loadStarterLibrary();
              setMessage(r.error ?? `Loaded ${r.added} starter entries.`);
            })
          }
        >
          Load starter library for an architecture practice
        </Button>
      )}

      {templates.length > 0 && (
        <Table aria-label="Task library" size="md">
          <TableHead>
            <TableRow>
              <TableHeader>Entry</TableHeader>
              <TableHeader>Bundle</TableHeader>
              <TableHeader>Scope</TableHeader>
              <TableHeader>Sized by</TableHeader>
              <TableHeader>Formula (hours)</TableHeader>
              <TableHeader>Range</TableHeader>
              {canWrite && <TableHeader>Actions</TableHeader>}
            </TableRow>
          </TableHead>
          <TableBody>
            {templates.map((t) => (
              <TableRow key={t.id}>
                <TableCell>{t.title} <Tag size="sm" type="gray">{t.code}</Tag></TableCell>
                <TableCell>{t.bundle}</TableCell>
                <TableCell>{t.scope === "PER_FLOOR" ? "Per floor" : "Per project"}</TableCell>
                <TableCell>{AREA_LABEL[t.area_basis]}</TableCell>
                <TableCell>{t.base_hours} + {t.hours_per_100sqm} / 100 m²</TableCell>
                <TableCell>{t.min_hours ?? "—"} – {t.max_hours ?? "—"}</TableCell>
                {canWrite && (
                  <TableCell>
                    <Button size="sm" kind="ghost" onClick={() => edit(t)}>Edit</Button>
                    <Button size="sm" kind="danger--ghost" disabled={busy}
                      onClick={() => startTransition(async () => { const r = await deleteTaskTemplate(t.id); if (r.error) setMessage(r.error); })}>
                      Delete
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {canWrite && (
        <form action={action} key={editing?.id ?? "new"}>
          <Stack gap={5}>
            <h3 className="cds--type-heading-compact-02">{editing ? `Edit ${editing.code}` : "Add library entry"}</h3>
            {state && "error" in state && <InlineNotification kind="error" lowContrast hideCloseButton title="Couldn't save" subtitle={state.error} />}
            {state && "ok" in state && <InlineNotification kind="success" lowContrast hideCloseButton title={state.ok} />}
            {editing && <input type="hidden" name="id" value={editing.id} />}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))", gap: "1rem" }}>
              <TextInput id="tpl-code" name="code" labelText="Code" defaultValue={editing?.code} required />
              <TextInput id="tpl-title" name="title" labelText="Title" defaultValue={editing?.title} required />
              <TextInput id="tpl-bundle" name="bundle" labelText="Bundle" defaultValue={editing?.bundle ?? "General"} />
              <Select id="tpl-scope" name="scope" labelText="Generated" value={scope} onChange={(e) => setScope(e.target.value)}>
                <SelectItem value="PROJECT" text="Once per project" />
                <SelectItem value="PER_FLOOR" text="Once per floor" />
              </Select>
              {scope === "PROJECT" && (
                <Select id="tpl-area" name="areaBasis" labelText="Sized by" defaultValue={editing?.area_basis === "FLOOR" ? "BUILT_UP" : editing?.area_basis ?? "BUILT_UP"}>
                  <SelectItem value="BUILT_UP" text="Built-up area" />
                  <SelectItem value="SITE" text="Site area" />
                  <SelectItem value="NONE" text="Fixed effort" />
                </Select>
              )}
              <TextInput id="tpl-base" name="baseHours" type="number" step="0.5" min={0} labelText="Base hours" defaultValue={editing?.base_hours ?? 0} />
              <TextInput id="tpl-rate" name="hoursPer100sqm" type="number" step="0.1" min={0} labelText="Hours per 100 m²" defaultValue={editing?.hours_per_100sqm ?? 0} />
              <TextInput id="tpl-min" name="minHours" type="number" step="0.5" min={0} labelText="Minimum hours" defaultValue={editing?.min_hours ?? ""} />
              <TextInput id="tpl-max" name="maxHours" type="number" step="0.5" min={0} labelText="Maximum hours" defaultValue={editing?.max_hours ?? ""} />
              <Select id="tpl-worktype" name="workType" labelText="Work type" defaultValue={editing?.work_type ?? ""}>
                <SelectItem value="" text="—" />
                <SelectItem value="DESIGN_COMMUNICATION" text="Design communication" />
                <SelectItem value="DESIGN_DEVELOPMENT" text="Design development" />
                <SelectItem value="TECHNICAL_PRODUCTION" text="Technical production" />
                <SelectItem value="CONSTRUCTION_SUPPORT" text="Construction support" />
              </Select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <Button type="submit" disabled={pending}>{editing ? "Save changes" : "Add entry"}</Button>
              {editing && <Button kind="secondary" onClick={() => edit(null)}>Cancel</Button>}
            </div>
          </Stack>
        </form>
      )}
    </Stack>
  );
}
