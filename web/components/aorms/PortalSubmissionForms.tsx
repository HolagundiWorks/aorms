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
  TextArea,
  TextInput,
} from "@carbon/react";
import {
  requestMeeting,
  submitChangeRequest,
  submitFeedback,
  type PortalActionState,
} from "../../lib/actions/portal";
import { FormGrid } from "./FormGrid";

const initialState: PortalActionState = null;

function ChangeRequestForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(submitChangeRequest, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not submit" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="crSubject" name="subject" labelText="Subject" required />
          <Select id="revisionCategory" name="revisionCategory" labelText="How significant is this?" defaultValue="MINOR">
            <SelectItem value="MINOR" text="Minor" />
            <SelectItem value="MAJOR" text="Major" />
            <SelectItem value="CRITICAL" text="Critical" />
          </Select>
        </FormGrid>
        <TextArea id="crBody" name="body" labelText="Details" rows={3} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Submitting…" : "Submit change request"}
        </Button>
      </Stack>
    </Form>
  );
}

function FeedbackForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(submitFeedback, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not submit" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="fbSubject" name="subject" labelText="Subject" required />
          <Select id="rating" name="rating" labelText="Rating (optional)" defaultValue="">
            <SelectItem value="" text="— No rating —" />
            {[1, 2, 3, 4, 5].map((n) => (
              <SelectItem key={n} value={String(n)} text={`${n} / 5`} />
            ))}
          </Select>
        </FormGrid>
        <TextArea id="fbBody" name="body" labelText="Comments" rows={3} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Submitting…" : "Send feedback"}
        </Button>
      </Stack>
    </Form>
  );
}

function MeetingRequestForm({ projectId }: { projectId: string }) {
  const [state, formAction, pending] = useActionState(requestMeeting, initialState);
  return (
    <Form action={formAction}>
      <input type="hidden" name="projectId" value={projectId} />
      <Stack gap={5}>
        {state?.error && (
          <InlineNotification kind="error" title="Could not submit" subtitle={state.error} hideCloseButton lowContrast />
        )}
        <FormGrid>
          <TextInput id="preferredDate" name="preferredDate" labelText="Preferred date (optional)" type="date" />
          <Select id="mode" name="mode" labelText="Mode" defaultValue="IN_PERSON">
            <SelectItem value="IN_PERSON" text="In-person" />
            <SelectItem value="VIDEO_CALL" text="Video call" />
            <SelectItem value="PHONE" text="Phone call" />
          </Select>
        </FormGrid>
        <TextArea id="agenda" name="agenda" labelText="Agenda (optional)" rows={3} />
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Requesting…" : "Request meeting"}
        </Button>
      </Stack>
    </Form>
  );
}

export function PortalSubmissionForms({ projectId }: { projectId: string }) {
  return (
    <Tabs>
      <TabList aria-label="Get in touch">
        <Tab>Change request</Tab>
        <Tab>Feedback</Tab>
        <Tab>Request a meeting</Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <ChangeRequestForm projectId={projectId} />
        </TabPanel>
        <TabPanel>
          <FeedbackForm projectId={projectId} />
        </TabPanel>
        <TabPanel>
          <MeetingRequestForm projectId={projectId} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
