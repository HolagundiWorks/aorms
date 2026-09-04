"use client";

import { useActionState } from "react";
import { Button, Form, InlineNotification, Select, SelectItem, Stack, TextArea, TextInput } from "@carbon/react";
import { createLesson, type LessonActionState } from "../../lib/actions/lessons";

type ProjectOption = { id: string; title: string };

const initialState: LessonActionState = null;

const CATEGORIES = ["DESIGN", "COORDINATION", "SITE", "CLIENT", "COMPLIANCE", "OTHER"];

export function NewLessonForm({ projects }: { projects: ProjectOption[] }) {
  const [state, formAction, pending] = useActionState(createLesson, initialState);

  return (
    <Form action={formAction} style={{ marginBottom: "2rem" }}>
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not save lesson" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <Select id="projectId" name="projectId" labelText="Project" defaultValue="">
          <SelectItem value="" text="— Select a project —" />
          {projects.map((p) => (
            <SelectItem key={p.id} value={p.id} text={p.title} />
          ))}
        </Select>
        <TextInput id="title" name="title" labelText="Title" required />
        <Select id="category" name="category" labelText="Category" defaultValue="OTHER">
          {CATEGORIES.map((c) => (
            <SelectItem key={c} value={c} text={c} />
          ))}
        </Select>
        <TextArea id="body" name="body" labelText="What happened" rows={3} required />
        <TextArea id="recommendations" name="recommendations" labelText="Recommendations" rows={2} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Add lesson"}
        </Button>
      </Stack>
    </Form>
  );
}
