import { Button, InlineNotification, Select, SelectItem, Stack } from "@carbon/react";
import { ACTIVITY_DOMAIN_TAG, activityDomain } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataState, StatusDot } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";
import { formatWhen } from "./workHelpers.js";

export function ActivityTab() {
  const [visibility, setVisibility] = useState<"STAFF" | "ALL">("STAFF");
  const listQ = trpc.activity.listOffice.useInfiniteQuery(
    { limit: 25, visibility },
    { getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined },
  );
  const items = listQ.data?.pages.flatMap((page) => page.rows) ?? [];

  return (
    <CarbonScope>
      <Stack gap={6}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
          <p className="cds--type-body-01" style={{ flex: 1, margin: 0 }}>
            Office-wide timeline for changes and notes.
          </p>
          <div style={{ minWidth: 160 }}>
            <Select
              id="act-vis"
              labelText="Visibility"
              size="sm"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as "STAFF" | "ALL")}
            >
              <SelectItem value="STAFF" text="Staff activity" />
              <SelectItem value="ALL" text="All activity" />
            </Select>
          </div>
        </div>

        {listQ.error && (
          <InlineNotification
            kind="error"
            lowContrast
            hideCloseButton
            title="Couldn't load activity"
            subtitle={listQ.error.message}
          />
        )}

        <DataState
          loading={listQ.isLoading && items.length === 0}
          isEmpty={!listQ.error && items.length === 0}
          columnCount={4}
          empty={{ title: "No activity yet", description: "Project changes and internal notes will appear here." }}
        >
          <Stack gap={5}>
            {items.map((item) => {
              const domain = activityDomain(item.eventType);
              const dcolor = ACTIVITY_DOMAIN_TAG[domain];
              return (
                <div
                  key={item.id}
                  style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--cds-border-subtle)" }}
                >
                  <Stack gap={3}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <StatusDot color={dcolor} label={domain} />
                      <StatusDot color="gray" label={item.eventType} />
                      <span className="cds--type-caption-01" style={{ color: "var(--cds-text-secondary)" }}>
                        {formatWhen(item.createdAt as unknown as string)}
                      </span>
                    </div>
                    <p style={{ margin: 0 }}>{item.summary}</p>
                    <p style={{ margin: 0 }}>
                      {item.actorName ?? "System"}
                      {item.projectId && (
                        <>
                          {" · "}
                          <Link to={`/projects/${item.projectId}`}>
                            {item.projectRef ?? item.projectTitle ?? "Project"}
                          </Link>
                        </>
                      )}
                    </p>
                  </Stack>
                </div>
              );
            })}
            {listQ.hasNextPage && (
              <div>
                <Button
                  kind="secondary"
                  disabled={listQ.isFetchingNextPage}
                  onClick={() => listQ.fetchNextPage()}
                >
                  {listQ.isFetchingNextPage ? "Loading…" : "Load older"}
                </Button>
              </div>
            )}
          </Stack>
        </DataState>
      </Stack>
    </CarbonScope>
  );
}
