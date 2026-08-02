/**
 * Wave 1 spike — IBM Carbon Design System coexistence probe.
 *
 * A throwaway public screen (`/carbon-spike`) that renders real @carbon/react
 * components under a Carbon <Theme>, next to the existing @hcw/ui-kit + MUI app.
 * Purpose: pressure-test the plan in docs/esti/CARBON-MIGRATION.md — that Carbon
 * installs, types, themes, and bundles cleanly in this Vite/React 19 app.
 *
 * NOTE (finding): importing @carbon/styles global CSS here injects Carbon's
 * reset + base type app-wide once this lazy chunk loads. That's the exact
 * global-CSS coexistence risk Wave 1 must resolve (scoped Sass / css-layers)
 * before Carbon goes on shared screens. Fine for a deliberate /carbon-spike.
 */
import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  Button,
  Column,
  Dropdown,
  Grid,
  InlineNotification,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Tag,
  TextInput,
} from "@carbon/react";
import { CarbonScope, type CarbonTheme } from "../carbon/CarbonScope.js";
import {
  StatusDot,
  DataState,
  ConfirmModal,
  PageBreadcrumb,
} from "../carbon/adapters/index.js";
import { ArrowRight, Add, CheckmarkFilled } from "@carbon/icons-react";

const SCHEMES: readonly CarbonTheme[] = ["white", "g10", "g90", "g100"];

const ROWS = [
  { id: "PRJ-001", name: "Sharma Villa", stage: "Design development", status: "On track" },
  { id: "PRJ-002", name: "Verde Offices", stage: "Schematic", status: "At risk" },
  { id: "PRJ-003", name: "Coastal Resort", stage: "Concept", status: "On track" },
];

/** Carbon-themed spike screen — not part of the shipped IA. */
export function CarbonSpike() {
  const [scheme, setScheme] = useState<CarbonTheme>("g10");
  const [name, setName] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <CarbonScope theme={scheme}>
      <div style={{ minHeight: "100vh", background: "var(--cds-background)", padding: "2rem" }}>
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <Stack gap={6}>
              {/* Header */}
              <Stack gap={3}>
                <Tag type="blue" size="sm">
                  Wave 1 spike
                </Tag>
                <h1 className="cds--type-productive-heading-05" style={{ margin: 0 }}>
                  IBM Carbon coexistence probe
                </h1>
                <p className="cds--type-body-long-01" style={{ maxWidth: "42rem" }}>
                  Real <code>@carbon/react</code> components under a Carbon{" "}
                  <code>&lt;Theme&gt;</code>, running inside the existing HCW-UI-Kit + MUI
                  app. See <code>docs/esti/CARBON-MIGRATION.md</code> for the roadmap.
                </p>
                <RouterLink to="/" className="cds--link">
                  ← Back to the live app
                </RouterLink>
              </Stack>

              {/* Theme switcher */}
              <div style={{ maxWidth: "20rem" }}>
                <Dropdown
                  id="carbon-spike-theme"
                  titleText="Carbon theme"
                  label="Select a theme"
                  items={SCHEMES as unknown as CarbonTheme[]}
                  selectedItem={scheme}
                  itemToString={(item) => (item ? String(item) : "")}
                  onChange={({ selectedItem }) => selectedItem && setScheme(selectedItem)}
                />
              </div>

              <InlineNotification
                kind="info"
                lowContrast
                title="Coexistence"
                subtitle="This screen loads Carbon global CSS on demand — the token-scoping question Wave 1 resolves."
                hideCloseButton
              />

              {/* Tabs + components */}
              <Tabs>
                <TabList aria-label="Spike sections">
                  <Tab>Inputs</Tab>
                  <Tab>Data table</Tab>
                  <Tab>Kit adapters</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel>
                    <Stack gap={5} style={{ maxWidth: "32rem", paddingTop: "1rem" }}>
                      <TextInput
                        id="carbon-spike-name"
                        labelText="Project name"
                        placeholder="e.g. Sharma Villa"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <Button renderIcon={ArrowRight}>Primary</Button>
                        <Button kind="secondary" renderIcon={Add}>
                          Secondary
                        </Button>
                        <Button kind="tertiary">Tertiary</Button>
                        <Button kind="danger--tertiary">Danger</Button>
                      </div>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <Tag type="green" renderIcon={CheckmarkFilled}>
                          On track
                        </Tag>
                        <Tag type="magenta">At risk</Tag>
                        <Tag type="gray">Draft</Tag>
                      </div>
                    </Stack>
                  </TabPanel>
                  <TabPanel>
                    <div style={{ paddingTop: "1rem" }}>
                      <Table size="lg" useZebraStyles>
                        <TableHead>
                          <TableRow>
                            <TableHeader>Ref</TableHeader>
                            <TableHeader>Project</TableHeader>
                            <TableHeader>Stage</TableHeader>
                            <TableHeader>Status</TableHeader>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {ROWS.map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{r.id}</TableCell>
                              <TableCell>{r.name}</TableCell>
                              <TableCell>{r.stage}</TableCell>
                              <TableCell>
                                <Tag type={r.status === "At risk" ? "magenta" : "green"} size="sm">
                                  {r.status}
                                </Tag>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </TabPanel>
                  <TabPanel>
                    <Stack gap={6} style={{ paddingTop: "1rem", maxWidth: "40rem" }}>
                      <PageBreadcrumb
                        linkComponent={RouterLink}
                        linkPropName="to"
                        items={[
                          { label: "Home", to: "/" },
                          { label: "Carbon spike", to: "/carbon-spike" },
                          { label: "Kit adapters" },
                        ]}
                      />
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <StatusDot color="green" label="On track" />
                        <StatusDot color="red" label="Blocked" shape="triangle" />
                        <StatusDot color="gray" label="Draft" />
                      </div>
                      <DataState
                        loading={false}
                        isEmpty
                        empty={{
                          title: "No projects yet",
                          description: "Adapter-rendered empty state (kit DataState API → Carbon Tile).",
                          action: <Button size="sm">Create project</Button>,
                        }}
                      >
                        {null}
                      </DataState>
                      <Button kind="danger" onClick={() => setConfirmOpen(true)}>
                        Open ConfirmModal
                      </Button>
                      <ConfirmModal
                        open={confirmOpen}
                        danger
                        kind="mistake"
                        heading="Delete this project?"
                        reason="This client has open invoices."
                        body="This cannot be undone."
                        confirmText="Delete"
                        onConfirm={() => setConfirmOpen(false)}
                        onClose={() => setConfirmOpen(false)}
                      />
                    </Stack>
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </Stack>
          </Column>
        </Grid>
      </div>
    </CarbonScope>
  );
}
