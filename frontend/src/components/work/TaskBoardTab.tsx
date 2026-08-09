import {
  Box,
  Checkbox,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { TASK_PRIORITY_LABEL, TASK_STATUS_LABEL, TaskStatus } from "@esti/contracts";
import { useState } from "react";
import { Link } from "react-router-dom";
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
    <Stack spacing={2}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="body2" sx={{ flex: 1, m: 0 }}>
          Drag-free status board — move a task with its column menu.
        </Typography>
        <FormControlLabel
          control={
            <Checkbox
              checked={myTasks}
              onChange={(e) => setMyTasks(e.target.checked)}
              size="small"
            />
          }
          label="My tasks"
        />
      </Box>

      <DataState
        loading={listQ.isLoading}
        isEmpty={tasks.length === 0}
        columnCount={4}
        empty={{ title: "No tasks", description: "Create a task on the Tasks tab to see it on the board." }}
      >
        <Grid container spacing={2}>
          {BOARD_COLUMNS.map(({ status, tag }) => {
            const colTasks = byStatus(status);
            return (
              <Grid key={status} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Stack spacing={2}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <StatusDot color={tag} label={TASK_STATUS_LABEL[status] ?? status} />
                    <span className="esti-label esti-label--secondary">{colTasks.length}</span>
                  </Box>
                  {colTasks.length === 0 ? (
                    <p className="esti-label esti-label--helper">No tasks</p>
                  ) : (
                    colTasks.map((t) => {
                      const overdue = t.dueDate && t.dueDate < today && t.status !== "DONE";
                      return (
                        <Box
                          key={t.id}
                          sx={{ py: 1, borderBottom: 1, borderColor: "divider" }}
                        >
                          <Stack spacing={1}>
                            <strong>{t.title}</strong>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                              <StatusDot
                                color={PRIORITY_TAG[t.priority] ?? "gray"}
                                label={TASK_PRIORITY_LABEL[t.priority] ?? t.priority}
                              />
                              {t.projectId && <Link to={`/projects/${t.projectId}`}>{t.projectRef}</Link>}
                            </Box>
                            {t.assignee && (
                              <span className="esti-label esti-label--secondary">{t.assignee}</span>
                            )}
                            {t.dueDate &&
                              (overdue ? (
                                <StatusDot color="red" label={`Overdue · ${t.dueDate}`} />
                              ) : (
                                <span className="esti-label esti-label--helper">Due {t.dueDate}</span>
                              ))}
                            <TextField
                              id={`bs-${t.id}`}
                              select
                              label="Move to"
                              size="small"
                              value={t.status}
                              onChange={(e) =>
                                update.mutate({
                                  id: t.id,
                                  status: e.target.value as (typeof TaskStatus.options)[number],
                                })
                              }
                              fullWidth
                              slotProps={{ inputLabel: { shrink: true } }}
                            >
                              {TaskStatus.options.map((s) => (
                                <MenuItem key={s} value={s}>
                                  {TASK_STATUS_LABEL[s] ?? s}
                                </MenuItem>
                              ))}
                            </TextField>
                          </Stack>
                        </Box>
                      );
                    })
                  )}
                </Stack>
              </Grid>
            );
          })}
        </Grid>
      </DataState>
    </Stack>
  );
}
