"use client";

import { useActionState } from "react";
import {
  Button,
  Checkbox,
  Form,
  InlineNotification,
  Select,
  SelectItem,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  TextInput,
} from "@carbon/react";
import { createTakeoffItem, type TakeoffActionState } from "../../lib/actions/takeoff";
import { FormGrid } from "./FormGrid";

const initialState: TakeoffActionState = null;

const DEDUCT_RULES = [
  { value: "Openings full", text: "Openings full (always deduct)" },
  { value: "IS1200 masonry", text: "IS1200 masonry (ignore < 0.1 m² openings)" },
  { value: "IS1200 plaster/paint", text: "IS1200 plaster/paint (always deduct + optional jambs)" },
  { value: "None", text: "None (gross area, no deduction)" },
];

function MasonryForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createTakeoffItem, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="category" value="MASONRY" />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add wall" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="m-mark" name="mark" labelText="Mark" placeholder="e.g. W1 — doors/windows deduct against this" required />
          <TextInput id="m-lengthMm" name="lengthMm" labelText="Length (mm)" type="number" step="any" required />
          <TextInput id="m-heightMm" name="heightMm" labelText="Height (mm)" type="number" step="any" required />
          <TextInput id="m-thicknessMm" name="thicknessMm" labelText="Thickness (mm)" type="number" step="any" defaultValue="230" />
          <Select id="m-unitType" name="unitType" labelText="Unit type" defaultValue="Brick">
            <SelectItem value="Brick" text="Brick" />
            <SelectItem value="ACC Block" text="ACC Block" />
            <SelectItem value="Cement Block" text="Cement Block" />
          </Select>
          <TextInput id="m-blockSize" name="blockSize" labelText="Block size (L×H×T mm)" defaultValue="600x200x150" />
          <TextInput id="m-mortarMix" name="mortarMix" labelText="Mortar mix" defaultValue="1:6" />
          <Select id="m-deductRule" name="deductRule" labelText="Deduction rule" defaultValue="IS1200 masonry">
            {DEDUCT_RULES.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.text} />
            ))}
          </Select>
        </FormGrid>
        <TextInput id="m-notes" name="notes" labelText="Notes (optional)" />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add wall"}
        </Button>
      </Stack>
    </Form>
  );
}

function PlasterForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createTakeoffItem, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="category" value="PLASTER" />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add plaster" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="p-mark" name="mark" labelText="Mark" placeholder="e.g. PL1" required />
          <TextInput
            id="p-wallMark"
            name="wallMark"
            labelText="Wall mark (optional — links deductions)"
            placeholder="e.g. W1"
          />
          <TextInput id="p-lengthMm" name="lengthMm" labelText="Length (mm)" type="number" step="any" required />
          <TextInput id="p-heightMm" name="heightMm" labelText="Height (mm)" type="number" step="any" required />
          <TextInput id="p-thicknessMm" name="thicknessMm" labelText="Thickness (mm)" type="number" step="any" defaultValue="12" />
          <TextInput id="p-mortarMix" name="mortarMix" labelText="Mortar mix" defaultValue="1:4" />
          <TextInput id="p-faces" name="faces" labelText="Faces (1 or 2)" type="number" step="1" defaultValue="1" />
          <Select id="p-deductRule" name="deductRule" labelText="Deduction rule" defaultValue="IS1200 plaster/paint">
            {DEDUCT_RULES.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.text} />
            ))}
          </Select>
        </FormGrid>
        <Checkbox id="p-addJambs" name="addJambs" labelText="Add jamb area (reveal of linked openings)" />
        <TextInput id="p-notes" name="notes" labelText="Notes (optional)" />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add plaster"}
        </Button>
      </Stack>
    </Form>
  );
}

function PaintingForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(createTakeoffItem, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="category" value="PAINTING" />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add painting" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="pt-mark" name="mark" labelText="Mark" placeholder="e.g. PT1" required />
          <TextInput
            id="pt-wallMark"
            name="wallMark"
            labelText="Wall mark (optional — links deductions)"
            placeholder="e.g. W1"
          />
          <TextInput id="pt-lengthMm" name="lengthMm" labelText="Length (mm)" type="number" step="any" required />
          <TextInput id="pt-heightMm" name="heightMm" labelText="Height (mm)" type="number" step="any" required />
          <TextInput id="pt-paintType" name="paintType" labelText="Paint type" defaultValue="Emulsion" />
          <TextInput id="pt-coats" name="coats" labelText="Coats" type="number" step="1" defaultValue="2" />
          <TextInput id="pt-faces" name="faces" labelText="Faces (1 or 2)" type="number" step="1" defaultValue="1" />
          <Select id="pt-deductRule" name="deductRule" labelText="Deduction rule" defaultValue="IS1200 plaster/paint">
            {DEDUCT_RULES.map((r) => (
              <SelectItem key={r.value} value={r.value} text={r.text} />
            ))}
          </Select>
        </FormGrid>
        <Checkbox id="pt-addJambs" name="addJambs" labelText="Add jamb area (reveal of linked openings)" />
        <TextInput id="pt-notes" name="notes" labelText="Notes (optional)" />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add painting"}
        </Button>
      </Stack>
    </Form>
  );
}

function OpeningForm({ projectId, category, label }: { projectId: string; category: "DOOR" | "WINDOW"; label: string }) {
  const [state, formAction, pending] = useActionState(createTakeoffItem, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="category" value={category} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title={`Could not add ${label.toLowerCase()}`} subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id={`o-${category}-mark`} name="mark" labelText="Mark" placeholder={category === "DOOR" ? "e.g. D1" : "e.g. WN1"} required />
          <TextInput
            id={`o-${category}-wallMark`}
            name="wallMark"
            labelText="Wall mark (which wall this deducts from)"
            placeholder="e.g. W1"
            required
          />
          <TextInput id={`o-${category}-widthMm`} name="widthMm" labelText="Width (mm)" type="number" step="any" required />
          <TextInput id={`o-${category}-heightMm`} name="heightMm" labelText="Height (mm)" type="number" step="any" required />
          <TextInput id={`o-${category}-nos`} name="nos" labelText="Nos" type="number" step="1" defaultValue="1" />
        </FormGrid>
        <Checkbox id={`o-${category}-deductFromWall`} name="deductFromWall" labelText="Deduct from linked wall" defaultChecked />
        <TextInput id={`o-${category}-notes`} name="notes" labelText="Notes (optional)" />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : `Add ${label.toLowerCase()}`}
        </Button>
      </Stack>
    </Form>
  );
}

// ── The other ~12 "simple" categories (PCC/earthwork/SSM/waterproofing/DPC/
// coping/screed/VDF/skirting/parapet/plinth-protection/flooring) share the
// same shape (mark + a few dimension fields + notes), so one generic form
// renders all of them from a small field-spec list instead of 12 near-
// duplicate components — see lib/takeoff/formulas.ts for each category's
// actual compute function. ──

type FieldSpec = {
  name: string;
  label: string;
  type?: "number" | "text" | "select";
  defaultValue?: string;
  step?: string;
  options?: { value: string; text: string }[];
};

const UNIT_TYPE_OPTIONS = [
  { value: "Brick", text: "Brick" },
  { value: "ACC Block", text: "ACC Block" },
  { value: "Cement Block", text: "Cement Block" },
];

const WATERPROOFING_MODE_OPTIONS = [
  { value: "Area", text: "Area (length × breadth)" },
  { value: "Periphery", text: "Periphery (length × height)" },
];

function SimpleCategoryForm({
  projectId,
  category,
  label,
  markPlaceholder,
  wallMarkOptional,
  fields,
}: {
  projectId: string;
  category: string;
  label: string;
  markPlaceholder: string;
  /** Most of these categories don't deduct against a wall, but a couple
   * (flooring) can still be linked to one for consistency with masonry's
   * own deduction engine. */
  wallMarkOptional?: boolean;
  fields: FieldSpec[];
}) {
  const [state, formAction, pending] = useActionState(createTakeoffItem, initialState);
  const idPrefix = category.toLowerCase();
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="category" value={category} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title={`Could not add ${label.toLowerCase()}`} subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id={`${idPrefix}-mark`} name="mark" labelText="Mark" placeholder={markPlaceholder} required />
          {wallMarkOptional && (
            <TextInput
              id={`${idPrefix}-wallMark`}
              name="wallMark"
              labelText="Wall mark (optional — links deductions)"
              placeholder="e.g. W1"
            />
          )}
          {fields.map((f) =>
            f.type === "select" ? (
              <Select key={f.name} id={`${idPrefix}-${f.name}`} name={f.name} labelText={f.label} defaultValue={f.defaultValue}>
                {(f.options ?? []).map((o) => (
                  <SelectItem key={o.value} value={o.value} text={o.text} />
                ))}
              </Select>
            ) : (
              <TextInput
                key={f.name}
                id={`${idPrefix}-${f.name}`}
                name={f.name}
                labelText={f.label}
                type={f.type ?? "text"}
                step={f.type === "number" ? (f.step ?? "any") : undefined}
                defaultValue={f.defaultValue}
              />
            ),
          )}
        </FormGrid>
        <TextInput id={`${idPrefix}-notes`} name="notes" labelText="Notes (optional)" />
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : `Add ${label.toLowerCase()}`}
        </Button>
      </Stack>
    </Form>
  );
}

export function NewTakeoffItemForms({ projectId }: { projectId: string }) {
  return (
    <Tabs>
      <TabList aria-label="Add take-off item">
        <Tab>Masonry wall</Tab>
        <Tab>Plaster</Tab>
        <Tab>Painting</Tab>
        <Tab>Door</Tab>
        <Tab>Window</Tab>
        <Tab>Flooring</Tab>
        <Tab>PCC</Tab>
        <Tab>Earthwork</Tab>
        <Tab>SSM</Tab>
        <Tab>Waterproofing</Tab>
        <Tab>DPC</Tab>
        <Tab>Coping</Tab>
        <Tab>Screed</Tab>
        <Tab>VDF</Tab>
        <Tab>Skirting</Tab>
        <Tab>Parapet</Tab>
        <Tab>Plinth protection</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <MasonryForm projectId={projectId} />
        </TabPanel>
        <TabPanel>
          <PlasterForm projectId={projectId} />
        </TabPanel>
        <TabPanel>
          <PaintingForm projectId={projectId} />
        </TabPanel>
        <TabPanel>
          <OpeningForm projectId={projectId} category="DOOR" label="Door" />
        </TabPanel>
        <TabPanel>
          <OpeningForm projectId={projectId} category="WINDOW" label="Window" />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="FLOORING"
            label="Flooring"
            markPlaceholder="e.g. FL1"
            wallMarkOptional
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm)", type: "number" },
              { name: "finishType", label: "Finish type", defaultValue: "Vitrified tiles" },
              {
                name: "surfaceKind",
                label: "Surface",
                type: "select",
                defaultValue: "Floor",
                options: [
                  { value: "Floor", text: "Floor" },
                  { value: "Wall", text: "Wall (tiles)" },
                ],
              },
              { name: "deductRule", label: "Deduction rule", type: "select", defaultValue: "Openings full", options: DEDUCT_RULES },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="PCC"
            label="PCC"
            markPlaceholder="e.g. PCC1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm)", type: "number" },
              { name: "thicknessMm", label: "Thickness (mm)", type: "number", defaultValue: "100" },
              { name: "mix", label: "Mix", defaultValue: "1:4:8" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="EARTHWORK"
            label="Earthwork"
            markPlaceholder="e.g. EW1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm)", type: "number" },
              { name: "depthMm", label: "Depth (mm)", type: "number" },
              { name: "workType", label: "Work type", defaultValue: "Excavation" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="SSM"
            label="SSM"
            markPlaceholder="e.g. SSM1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm)", type: "number" },
              { name: "heightMm", label: "Height (mm)", type: "number" },
              { name: "mortarMix", label: "Mortar mix", defaultValue: "1:6" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="WATERPROOFING"
            label="Waterproofing"
            markPlaceholder="e.g. WP1"
            fields={[
              { name: "workMode", label: "Mode", type: "select", defaultValue: "Area", options: WATERPROOFING_MODE_OPTIONS },
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm) — Area mode", type: "number" },
              { name: "heightMm", label: "Height (mm) — Periphery mode", type: "number" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="DPC"
            label="DPC"
            markPlaceholder="e.g. DPC1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "widthMm", label: "Width (mm)", type: "number" },
              { name: "thicknessMm", label: "Thickness (mm)", type: "number", defaultValue: "40" },
              { name: "mortarMix", label: "Mortar mix", defaultValue: "1:3" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="COPING"
            label="Coping"
            markPlaceholder="e.g. CP1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "widthMm", label: "Width (mm)", type: "number" },
              { name: "depthMm", label: "Depth (mm)", type: "number" },
              { name: "concreteGrade", label: "Concrete grade", defaultValue: "PCC" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="SCREED"
            label="Screed"
            markPlaceholder="e.g. SC1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm)", type: "number" },
              { name: "thicknessMm", label: "Thickness (mm)", type: "number", defaultValue: "40" },
              { name: "mix", label: "Mix", defaultValue: "1:4:8" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="VDF"
            label="VDF"
            markPlaceholder="e.g. VDF1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm)", type: "number" },
              { name: "thicknessMm", label: "Thickness (mm)", type: "number", defaultValue: "100" },
              { name: "concreteGrade", label: "Concrete grade", defaultValue: "M25" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="SKIRTING"
            label="Skirting"
            markPlaceholder="e.g. SK1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "heightMm", label: "Height (mm)", type: "number", defaultValue: "100" },
              { name: "finishType", label: "Finish type", defaultValue: "Tile" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="PARAPET"
            label="Parapet"
            markPlaceholder="e.g. PR1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "heightMm", label: "Height (mm)", type: "number", defaultValue: "900" },
              { name: "thicknessMm", label: "Thickness (mm)", type: "number", defaultValue: "115" },
              { name: "unitType", label: "Unit type", type: "select", defaultValue: "Brick", options: UNIT_TYPE_OPTIONS },
              { name: "blockSize", label: "Block size (L×H×T mm)", defaultValue: "600x200x150" },
            ]}
          />
        </TabPanel>
        <TabPanel>
          <SimpleCategoryForm
            projectId={projectId}
            category="PLINTH_PROTECTION"
            label="Plinth protection"
            markPlaceholder="e.g. PP1"
            fields={[
              { name: "lengthMm", label: "Length (mm)", type: "number" },
              { name: "breadthMm", label: "Breadth (mm)", type: "number", defaultValue: "600" },
              { name: "thicknessMm", label: "Thickness (mm)", type: "number", defaultValue: "75" },
              { name: "finishType", label: "Finish type", defaultValue: "PCC" },
            ]}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
