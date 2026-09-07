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

export function NewTakeoffItemForms({ projectId }: { projectId: string }) {
  return (
    <Tabs>
      <TabList aria-label="Add take-off item">
        <Tab>Masonry wall</Tab>
        <Tab>Plaster</Tab>
        <Tab>Painting</Tab>
        <Tab>Door</Tab>
        <Tab>Window</Tab>
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
      </TabPanels>
    </Tabs>
  );
}
