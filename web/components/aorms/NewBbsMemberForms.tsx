"use client";

import { useActionState } from "react";
import {
  Button,
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
import {
  addBeamMember,
  addColumnMember,
  addFootingMember,
  addSlabMember,
  type BbsActionState,
} from "../../lib/actions/bbs";
import { FormGrid } from "./FormGrid";

const initialState: BbsActionState = null;

/** One row of dia/count fields — up to 3 per bar group (see
 * lib/actions/bbs.ts's diaCountPairs() for why 3, not a dynamic list). */
function BarDiaCountFields({ prefix, label }: { prefix: string; label: string }) {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} style={{ display: "flex", gap: "0.5rem" }}>
          <TextInput
            id={`${prefix}Dia${i}`}
            name={`${prefix}Dia${i}`}
            labelText={`${label} ${i} — dia (mm)`}
            type="number"
            step="any"
            size="sm"
          />
          <TextInput
            id={`${prefix}Count${i}`}
            name={`${prefix}Count${i}`}
            labelText="Count"
            type="number"
            step="any"
            size="sm"
          />
        </div>
      ))}
    </>
  );
}

function ColumnForm({ bbsId }: { bbsId: string }) {
  const [state, formAction, pending] = useActionState(addColumnMember, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="bbsId" value={bbsId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add column" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="mark" name="mark" labelText="Mark (optional)" placeholder="e.g. C1" />
          <TextInput id="widthMm" name="widthMm" labelText="Width (mm)" type="number" step="any" required />
          <TextInput id="depthMm" name="depthMm" labelText="Depth (mm)" type="number" step="any" required />
          <TextInput id="heightMm" name="heightMm" labelText="Height (mm)" type="number" step="any" required />
          <TextInput id="coverMm" name="coverMm" labelText="Cover (mm)" type="number" step="any" defaultValue="40" />
          <TextInput id="stirrupDiaMm" name="stirrupDiaMm" labelText="Tie dia (mm)" type="number" step="any" required />
          <TextInput id="spacingMm" name="spacingMm" labelText="Tie spacing (mm)" type="number" step="any" required />
          <Select id="hookAngle" name="hookAngle" labelText="Hook angle" defaultValue="135">
            <SelectItem value="90" text="90°" />
            <SelectItem value="135" text="135°" />
            <SelectItem value="180" text="180°" />
          </Select>
          <Select id="tieType" name="tieType" labelText="Tie type" defaultValue="Closed">
            <SelectItem value="Closed" text="Closed" />
            <SelectItem value="Closed+Crosstie" text="Closed + Crosstie" />
            <SelectItem value="Double Tie" text="Double Tie" />
            <SelectItem value="Circular" text="Circular" />
            <SelectItem value="Spiral" text="Spiral" />
          </Select>
        </FormGrid>
        <FormGrid>
          <BarDiaCountFields prefix="main" label="Main bar" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add column"}
        </Button>
      </Stack>
    </Form>
  );
}

function BeamForm({ bbsId }: { bbsId: string }) {
  const [state, formAction, pending] = useActionState(addBeamMember, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="bbsId" value={bbsId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add beam" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="beamMark" name="mark" labelText="Mark (optional)" placeholder="e.g. B1" />
          <TextInput id="clearSpanMm" name="clearSpanMm" labelText="Clear span (mm)" type="number" step="any" required />
          <TextInput id="beamWidthMm" name="widthMm" labelText="Width (mm)" type="number" step="any" required />
          <TextInput id="beamDepthMm" name="depthMm" labelText="Depth (mm)" type="number" step="any" required />
          <TextInput id="beamCoverMm" name="coverMm" labelText="Cover (mm)" type="number" step="any" defaultValue="25" />
          <Select id="beamConcreteGrade" name="concreteGrade" labelText="Concrete grade" defaultValue="M20">
            {["M20", "M25", "M30", "M35", "M40"].map((g) => (
              <SelectItem key={g} value={g} text={g} />
            ))}
          </Select>
          <Select id="beamSteelGrade" name="steelGrade" labelText="Steel grade" defaultValue="Fe415">
            {["Fe250", "Fe415", "Fe500", "Fe550"].map((g) => (
              <SelectItem key={g} value={g} text={g} />
            ))}
          </Select>
          <TextInput id="beamStirrupDiaMm" name="stirrupDiaMm" labelText="Stirrup dia (mm)" type="number" step="any" required />
          <TextInput id="spacingSupportMm" name="spacingSupportMm" labelText="Spacing at support (mm)" type="number" step="any" required />
          <TextInput id="spacingMiddleMm" name="spacingMiddleMm" labelText="Spacing at middle (mm)" type="number" step="any" required />
          <Select id="stirrupLegs" name="stirrupLegs" labelText="Stirrup legs" defaultValue="2">
            <SelectItem value="2" text="2-leg" />
            <SelectItem value="4" text="4-leg" />
          </Select>
          <Select id="beamHookAngle" name="hookAngle" labelText="Hook angle" defaultValue="135">
            <SelectItem value="90" text="90°" />
            <SelectItem value="135" text="135°" />
            <SelectItem value="180" text="180°" />
          </Select>
          <Select id="topBarType" name="topBarType" labelText="Top bar type" defaultValue="Full Span">
            <SelectItem value="Full Span" text="Full Span" />
            <SelectItem value="At Support" text="At Support" />
          </Select>
        </FormGrid>
        <FormGrid>
          <BarDiaCountFields prefix="top" label="Top bar" />
          <BarDiaCountFields prefix="bottom" label="Bottom bar" />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add beam"}
        </Button>
      </Stack>
    </Form>
  );
}

function SlabForm({ bbsId }: { bbsId: string }) {
  const [state, formAction, pending] = useActionState(addSlabMember, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="bbsId" value={bbsId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add slab" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="slabMark" name="mark" labelText="Mark (optional)" placeholder="e.g. S1" />
          <TextInput id="spanXMm" name="spanXMm" labelText="Span X (mm)" type="number" step="any" required />
          <TextInput id="spanYMm" name="spanYMm" labelText="Span Y (mm)" type="number" step="any" required />
          <TextInput id="thicknessMm" name="thicknessMm" labelText="Thickness (mm)" type="number" step="any" required />
          <TextInput id="slabCoverMm" name="coverMm" labelText="Cover (mm)" type="number" step="any" defaultValue="20" />
          <Select id="slabConcreteGrade" name="concreteGrade" labelText="Concrete grade" defaultValue="M20">
            {["M20", "M25", "M30", "M35", "M40"].map((g) => (
              <SelectItem key={g} value={g} text={g} />
            ))}
          </Select>
          <Select id="slabSteelGrade" name="steelGrade" labelText="Steel grade" defaultValue="Fe415">
            {["Fe250", "Fe415", "Fe500", "Fe550"].map((g) => (
              <SelectItem key={g} value={g} text={g} />
            ))}
          </Select>
          <Select id="slabType" name="slabType" labelText="Slab type" defaultValue="One-Way">
            <SelectItem value="One-Way" text="One-Way" />
            <SelectItem value="Two-Way" text="Two-Way" />
          </Select>
          <TextInput id="diaXMm" name="diaXMm" labelText="Main bar dia X (mm)" type="number" step="any" required />
          <TextInput id="spacingXMm" name="spacingXMm" labelText="Spacing X (mm)" type="number" step="any" required />
          <TextInput id="diaYMm" name="diaYMm" labelText="Bar dia Y (mm)" type="number" step="any" required />
          <TextInput id="spacingYMm" name="spacingYMm" labelText="Spacing Y (mm)" type="number" step="any" required />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add slab"}
        </Button>
      </Stack>
    </Form>
  );
}

function FootingForm({ bbsId }: { bbsId: string }) {
  const [state, formAction, pending] = useActionState(addFootingMember, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="bbsId" value={bbsId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not add footing" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="footingMark" name="mark" labelText="Mark (optional)" placeholder="e.g. F1" />
          <TextInput id="lengthMm" name="lengthMm" labelText="Length (mm)" type="number" step="any" required />
          <TextInput id="footingWidthMm" name="widthMm" labelText="Width (mm)" type="number" step="any" required />
          <TextInput id="columnLengthMm" name="columnLengthMm" labelText="Column length (mm)" type="number" step="any" required />
          <TextInput id="columnWidthMm" name="columnWidthMm" labelText="Column width (mm)" type="number" step="any" required />
          <TextInput id="footingDepthMm" name="depthMm" labelText="Depth (mm)" type="number" step="any" required />
          <TextInput id="footingCoverMm" name="coverMm" labelText="Cover (mm)" type="number" step="any" defaultValue="50" />
          <Select id="footingConcreteGrade" name="concreteGrade" labelText="Concrete grade" defaultValue="M20">
            {["M20", "M25", "M30", "M35", "M40"].map((g) => (
              <SelectItem key={g} value={g} text={g} />
            ))}
          </Select>
          <Select id="footingSteelGrade" name="steelGrade" labelText="Steel grade" defaultValue="Fe415">
            {["Fe250", "Fe415", "Fe500", "Fe550"].map((g) => (
              <SelectItem key={g} value={g} text={g} />
            ))}
          </Select>
          <TextInput id="diaLMm" name="diaLMm" labelText="Bar dia L (mm)" type="number" step="any" required />
          <TextInput id="spacingLMm" name="spacingLMm" labelText="Spacing L (mm)" type="number" step="any" required />
          <TextInput id="diaBMm" name="diaBMm" labelText="Bar dia B (mm)" type="number" step="any" required />
          <TextInput id="spacingBMm" name="spacingBMm" labelText="Spacing B (mm)" type="number" step="any" required />
        </FormGrid>
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Adding…" : "Add footing"}
        </Button>
      </Stack>
    </Form>
  );
}

export function NewBbsMemberForms({ bbsId }: { bbsId: string }) {
  return (
    <Tabs>
      <TabList aria-label="Add member">
        <Tab>Column</Tab>
        <Tab>Beam</Tab>
        <Tab>Slab</Tab>
        <Tab>Footing</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <ColumnForm bbsId={bbsId} />
        </TabPanel>
        <TabPanel>
          <BeamForm bbsId={bbsId} />
        </TabPanel>
        <TabPanel>
          <SlabForm bbsId={bbsId} />
        </TabPanel>
        <TabPanel>
          <FootingForm bbsId={bbsId} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
