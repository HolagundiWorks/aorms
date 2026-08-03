import { Checkbox, Column, Grid, Select, SelectItem, Stack } from "@carbon/react";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL, TaskStatus } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
import { CarbonScope } from "../../carbon/CarbonScope.js";
import { DataState, StatusDot } from "../../carbon/adapters/index.js";
import { trpc } from "../../lib/trpc.js";
import { BOARD_COLUMNS, PRIORITY_TAG } from "./workHelpers.js";

export function TaskBoardTab() {
  const utils = trpc.useUtils();
  const [myTasks, setMyTasks] = useState(false);
  const listQ = trpc.tasks.list.useQuery({ myTasks });
  const update = trpc.tasks.update.useMutation({
    meta: { errorTitle: "Couldn't update the task" },
    onSuccess: () => utils.tasks.list.invalidate(),
  });
  const today = new Date().toISOString().slice(0, 10);

  const tasks = listQ.data ?? [];
  const byStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <CarbonScope>
      <Stack gap={5}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <p className="cds--type-body-01" style={{ flex: 1, margin: 0 }}>
            Drag-free status board — move a task with its column menu.
          </p>
          <Checkbox
            id="b-mine"
            labelText="My tasks"
            checked={myTasks}
            onChange={(_e, { checked }) => setMyTasks(checked)}
          />
        </div>

        <DataState
          loading={listQ.isLoading}
          isEmpty={tasks.length === 0}
          columnCount={4}
          empty={{ title: "No tasks", description: "Create a task on the Tasks tab to see it on the board." }}
        >
          <Grid>
            {BOARD_COLUMNS.map(({ status, tag }) => {
              const colTasks = byStatus(status);
              return (
                <Column key={status} sm={4} md={4} lg={4}>
                  <Stack gap={5}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <StatusDot color={tag} label={TASK_STATUS_LABEL[status] ?? status} />
                      <span className="esti-label esti-label--secondary">{colTasks.length}</span>
                    </div>
                    {colTasks.length === 0 ? (
                      <p className="esti-label esti-label--helper">No tasks</p>
                    ) : (
                      colTasks.map((t) => {
                        const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                        return (
                          <div
                            key={t.id}
                            style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--cds-border-subtle)" }}
                          >
                            <Stack gap={3}>
                              <strong>{t.title}</strong>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                <StatusDot
                                  color={PRIORITY_TAG[t.priority] ?? "gray"}
                                  label={TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                                />
                                {t.projectId && <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link>}
                              </div>
                              {t.assignee && (
                                <span className="esti-label esti-label--secondary">{t.assignee}</span>
                              )}
                              {t.dueDate &&
                                (overdue ? (
                                  <StatusDot color="red" label={`Overdue · ${t.dueDate}`} />
                                ) : (
                                  <span className="esti-label esti-label--helper">Due {t.dueDate}</span>
                                ))}
                              <Select
                                id={`bs-${t.id}`}
                                labelText="Move to"
                                hideLabel
                                size="sm"
                                value={t.status}
                                onChange={(e) =>
                                  update.mutate({
                                    id: t.id,
                                    status: e.target.value as (typeof TaskStatus.options)[number],
                                  })
                                }
                              >
                                {TaskStatus.options.map((s) => (
                                  <SelectItem key={s} value={s} text={TASK_STATUS_LABEL[s] ?? s} />
                                ))}
                              </Select>
                            </Stack>
                          </div>
                        );
                      })
                    )}
                  </Stack>
                </Column>
              );
            })}
          </Grid>
        </DataState>
      </Stack>
    </CarbonScope>
  );
}
