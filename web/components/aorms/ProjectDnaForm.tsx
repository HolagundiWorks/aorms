"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea } from "@carbon/react";
import { saveProjectDna } from "../../lib/actions/project-dna";
import { FormGrid } from "./FormGrid";

type ActionState = { error: string } | null;
const initialState: ActionState = null;

export type ProjectDnaValues = {
  budget_mode: string;
  vastu_requirement: string;
  design_language: string;
  design_flexibility: string;
  decision_makers: string;
  timeline_criticality: string;
  material_expectation: string;
  revision_tolerance: string;
  custom_notes: string | null;
} | null;

const OPTIONS = {
  budgetMode: {
    FLEXIBLE: "Flexible", MODERATE: "Moderate", STRICT: "Strict", VERY_STRICT: "Very strict",
  },
  vastuRequirement: {
    NONE: "None", PARTIAL: "Partial", STRONG: "Strong", STRICT_TRADITIONAL: "Strict traditional",
  },
  designLanguage: {
    MINIMALIST: "Minimalist", CONTEMPORARY: "Contemporary", TRADITIONAL: "Traditional", LUXURY: "Luxury",
    MODERN_TROPICAL: "Modern tropical", INDUSTRIAL: "Industrial", CUSTOM: "Custom",
  },
  designFlexibility: {
    ARCHITECT_FREEDOM: "Architect freedom", APPROVAL_EVERY_STAGE: "Approval every stage", STRICT_REQUIREMENT: "Strict requirement",
  },
  decisionMakers: {
    SINGLE_OWNER: "Single owner", COUPLE: "Couple", FAMILY: "Family", PARTNERS: "Partners", CORPORATE_COMMITTEE: "Corporate committee",
  },
  timelineCriticality: {
    FLEXIBLE: "Flexible", MODERATE: "Moderate", STRICT: "Strict", URGENT: "Urgent",
  },
  materialExpectation: {
    ECONOMY: "Economy", MID_RANGE: "Mid range", PREMIUM: "Premium", ULTRA_PREMIUM: "Ultra premium",
  },
  revisionTolerance: {
    LOW: "Low", MODERATE: "Moderate", HIGH: "High", UNLIMITED: "Unlimited",
  },
} as const;

const LABELS: Record<keyof typeof OPTIONS, string> = {
  budgetMode: "Budget mode",
  vastuRequirement: "Vastu requirement",
  designLanguage: "Design language",
  designFlexibility: "Design flexibility",
  decisionMakers: "Decision makers",
  timelineCriticality: "Timeline criticality",
  materialExpectation: "Material expectation",
  revisionTolerance: "Revision tolerance",
};

export function ProjectDnaForm({ projectId, values }: { projectId: string; values: ProjectDnaValues }) {
  const boundAction = saveProjectDna.bind(null, projectId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const current: Record<keyof typeof OPTIONS, string> = {
    budgetMode: values?.budget_mode ?? "",
    vastuRequirement: values?.vastu_requirement ?? "",
    designLanguage: values?.design_language ?? "",
    designFlexibility: values?.design_flexibility ?? "",
    decisionMakers: values?.decision_makers ?? "",
    timelineCriticality: values?.timeline_criticality ?? "",
    materialExpectation: values?.material_expectation ?? "",
    revisionTolerance: values?.revision_tolerance ?? "",
  };

  return (
    <Form action={formAction}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save DNA" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          {(Object.keys(OPTIONS) as (keyof typeof OPTIONS)[]).map((field) => (
            <Select key={field} id={field} name={field} labelText={LABELS[field]} defaultValue={current[field]}>
              <SelectItem value="" text="— Select —" />
              {Object.entries(OPTIONS[field]).map(([code, label]) => (
                <SelectItem key={code} value={code} text={label} />
              ))}
            </Select>
          ))}
        </FormGrid>
        <TextArea id="customNotes" name="customNotes" labelText="Custom notes" rows={2} defaultValue={values?.custom_notes ?? ""} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save DNA"}
        </Button>
      </Stack>
    </Form>
  );
}
