import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import NearMeOutlinedIcon from "@mui/icons-material/NearMeOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import GestureOutlinedIcon from "@mui/icons-material/GestureOutlined";
import { STICKY_NOTE_COLORS } from "@esti/contracts";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { ConfirmModal } from "../ConfirmModal.js";
import { ContextualComments } from "../ContextualComments.js";
import { DataState } from "../DataState.js";
import { useUploadAuth } from "../../lib/uploadAuth.js";
import { trpc } from "../../lib/trpc.js";

type Tool = "select" | "sticky" | "pen" | "image";

type CanvasItem = {
  id: string;
  kind: string;
  x: number;
  y: number;
  width: number | null;
  height: number | null;
  rotation: number;
  zIndex: number;
  payload: Record<string, unknown>;
  url?: string | null;
};

type DragState = {
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
};

type StrokeState = {
  points: { x: number; y: number }[];
};

function payloadText(payload: Record<string, unknown>): string {
  return typeof payload.text === "string" ? payload.text : "";
}

function payloadColor(payload: Record<string, unknown>): string {
  return typeof payload.color === "string" ? payload.color : STICKY_NOTE_COLORS[0];
}

function payloadPoints(payload: Record<string, unknown>): { x: number; y: number }[] {
  if (!Array.isArray(payload.points)) return [];
  return payload.points.filter(
    (p): p is { x: number; y: number } =>
      !!p && typeof p === "object" && typeof (p as { x: unknown }).x === "number" && typeof (p as { y: unknown }).y === "number",
  );
}

function pathD(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

/**
 * Project › Moodboard — Canva-like stage for images, pen markup, and sticky
 * notes, with threaded discussion for project collaboration.
 */
export function ProjectMoodboard({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const { authorizedFetch } = useUploadAuth();
  const listQ = trpc.moodboard.listByProject.useQuery({ projectId });
  const [boardId, setBoardId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("Moodboard");
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stickyColor, setStickyColor] = useState<string>(STICKY_NOTE_COLORS[0]);
  const [localItems, setLocalItems] = useState<CanvasItem[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [stroke, setStroke] = useState<StrokeState | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [scale, setScale] = useState(1);

  const detailQ = trpc.moodboard.byId.useQuery(
    { id: boardId! },
    { enabled: !!boardId, refetchInterval: 15_000 },
  );

  useEffect(() => {
    if (!boardId && listQ.data && listQ.data.length > 0) {
      setBoardId(listQ.data[0]!.id);
    }
  }, [boardId, listQ.data]);

  useEffect(() => {
    if (detailQ.data?.items) {
      setLocalItems(detailQ.data.items as CanvasItem[]);
    }
  }, [detailQ.data?.items]);

  const board = detailQ.data?.board;
  const canvasW = board?.canvasWidth ?? 1920;
  const canvasH = board?.canvasHeight ?? 1080;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const pad = 24;
      const availW = Math.max(320, el.clientWidth - pad);
      const availH = Math.max(240, el.clientHeight - pad);
      setScale(Math.min(1, availW / canvasW, availH / canvasH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasW, canvasH, boardId]);

  const createBoard = trpc.moodboard.create.useMutation({
    meta: { errorTitle: "Couldn't create moodboard" },
    onSuccess: async (row) => {
      pushToast({ kind: "success", title: "Moodboard created" });
      setCreateOpen(false);
      setTitle("Moodboard");
      setBoardId(row.id);
      await utils.moodboard.listByProject.invalidate({ projectId });
    },
  });

  const deleteBoard = trpc.moodboard.delete.useMutation({
    meta: { errorTitle: "Couldn't delete moodboard" },
    onSuccess: async () => {
      pushToast({ kind: "success", title: "Moodboard deleted" });
      setDeleteBoardOpen(false);
      setBoardId(null);
      setSelectedId(null);
      await utils.moodboard.listByProject.invalidate({ projectId });
    },
  });

  const upsertItem = trpc.moodboard.upsertItem.useMutation({
    meta: { errorTitle: "Couldn't update moodboard item" },
    onSuccess: async () => {
      if (boardId) await utils.moodboard.byId.invalidate({ id: boardId });
    },
  });

  const updateTransform = trpc.moodboard.updateTransform.useMutation({
    meta: { errorTitle: "Couldn't move item" },
    onSuccess: async () => {
      if (boardId) await utils.moodboard.byId.invalidate({ id: boardId });
    },
  });

  const deleteItem = trpc.moodboard.deleteItem.useMutation({
    meta: { errorTitle: "Couldn't delete item" },
    onSuccess: async () => {
      setSelectedId(null);
      if (boardId) await utils.moodboard.byId.invalidate({ id: boardId });
    },
  });

  useScreenActions(
    createOpen || deleteBoardOpen
      ? []
      : boardId
        ? [
            {
              id: "mood-add-image",
              zone: "center" as const,
              tone: "primary" as const,
              label: "Import image",
              icon: <ImageOutlinedIcon />,
              onClick: () => fileRef.current?.click(),
            },
            {
              id: "mood-new-board",
              zone: "right" as const,
              label: "New board",
              icon: <AddIcon />,
              onClick: () => setCreateOpen(true),
            },
          ]
        : [
            {
              id: "mood-create",
              zone: "center" as const,
              tone: "primary" as const,
              label: "Create moodboard",
              icon: <AddIcon />,
              onClick: () => setCreateOpen(true),
            },
          ],
    [boardId, createOpen, deleteBoardOpen],
  );

  function stagePoint(e: ReactPointerEvent): { x: number; y: number } {
    const stage = stageRef.current?.querySelector("[data-mood-canvas]") as HTMLElement | null;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }

  async function uploadImage(file: File) {
    if (!boardId) return;
    const res = await authorizedFetch("/upload/mood-image", (fd) => {
      fd.append("moodboardId", boardId);
      fd.append("file", file);
    });
    if (!res.ok) {
      pushToast({ kind: "error", title: "Image upload failed" });
      return;
    }
    pushToast({ kind: "success", title: "Image added" });
    await utils.moodboard.byId.invalidate({ id: boardId });
    setTool("select");
  }

  function onCanvasPointerDown(e: ReactPointerEvent) {
    if (!boardId) return;
    const pt = stagePoint(e);

    if (tool === "sticky") {
      upsertItem.mutate({
        moodboardId: boardId,
        kind: "STICKY",
        x: pt.x - 90,
        y: pt.y - 70,
        width: 180,
        height: 160,
        payload: { text: "", color: stickyColor },
      });
      setTool("select");
      return;
    }

    if (tool === "pen") {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      setStroke({ points: [pt] });
      return;
    }

    if (tool === "select" && e.target === e.currentTarget) {
      setSelectedId(null);
    }
  }

  function onCanvasPointerMove(e: ReactPointerEvent) {
    const pt = stagePoint(e);
    if (stroke) {
      setStroke({ points: [...stroke.points, pt] });
      return;
    }
    if (drag) {
      const dx = pt.x - drag.startX;
      const dy = pt.y - drag.startY;
      setLocalItems((items) =>
        items.map((it) =>
          it.id === drag.id ? { ...it, x: drag.origX + dx, y: drag.origY + dy } : it,
        ),
      );
    }
  }

  function onCanvasPointerUp() {
    if (stroke && boardId && stroke.points.length >= 2) {
      const xs = stroke.points.map((p) => p.x);
      const ys = stroke.points.map((p) => p.y);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      const localPts = stroke.points.map((p) => ({ x: p.x - minX, y: p.y - minY }));
      upsertItem.mutate({
        moodboardId: boardId,
        kind: "PATH",
        x: minX,
        y: minY,
        width: Math.max(1, Math.max(...xs) - minX),
        height: Math.max(1, Math.max(...ys) - minY),
        payload: { points: localPts, stroke: "#141517", strokeWidth: 3 },
      });
      setStroke(null);
      setTool("select");
      return;
    }
    setStroke(null);

    if (drag) {
      const item = localItems.find((i) => i.id === drag.id);
      if (item) {
        updateTransform.mutate({ id: item.id, x: item.x, y: item.y });
      }
      setDrag(null);
    }
  }

  function startDrag(e: ReactPointerEvent, item: CanvasItem) {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(item.id);
    const pt = stagePoint(e);
    setDrag({ id: item.id, startX: pt.x, startY: pt.y, origX: item.x, origY: item.y });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  const selected = localItems.find((i) => i.id === selectedId) ?? null;
  const boards = listQ.data ?? [];

  return (
    <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        <TextField
          select
          size="small"
          label="Board"
          value={boardId ?? ""}
          onChange={(e) => {
            setBoardId(e.target.value || null);
            setSelectedId(null);
          }}
          sx={{ minWidth: 220 }}
          disabled={boards.length === 0}
        >
          {boards.map((b) => (
            <MenuItem key={b.id} value={b.id}>
              {b.ref} · {b.title}
            </MenuItem>
          ))}
        </TextField>
        <Button startIcon={<AddIcon />} size="small" onClick={() => setCreateOpen(true)}>
          New board
        </Button>
        {boardId && (
          <IconButton
            aria-label="Delete moodboard"
            size="small"
            onClick={() => setDeleteBoardOpen(true)}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />
        {boardId && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={tool}
            onChange={(_, v: Tool | null) => {
              if (!v) return;
              if (v === "image") {
                fileRef.current?.click();
                return;
              }
              setTool(v);
            }}
          >
            <ToggleButton value="select" aria-label="Select">
              <Tooltip title="Select / move">
                <NearMeOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="sticky" aria-label="Sticky note">
              <Tooltip title="Sticky note">
                <StickyNote2OutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="pen" aria-label="Draw">
              <Tooltip title="Draw">
                <GestureOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="image" aria-label="Import image">
              <Tooltip title="Import image">
                <ImageOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void uploadImage(file);
          }}
        />
      </Stack>

      {tool === "sticky" && (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Sticky colour — click the canvas to place
          </Typography>
          {STICKY_NOTE_COLORS.map((c) => (
            <Box
              key={c}
              component="button"
              type="button"
              aria-label={`Sticky colour ${c}`}
              onClick={() => setStickyColor(c)}
              sx={{
                width: 18,
                height: 18,
                borderRadius: 0.5,
                border: stickyColor === c ? "2px solid" : "1px solid",
                borderColor: stickyColor === c ? "text.primary" : "divider",
                bgcolor: c,
                p: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </Stack>
      )}

      <DataState
        loading={listQ.isLoading}
        isEmpty={!listQ.isLoading && boards.length === 0}
        columnCount={3}
        empty={{
          title: "No moodboards yet",
          description:
            "Create a board to collect references, mark up images, and discuss design direction with the project team.",
          action: (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
              Create moodboard
            </Button>
          ),
        }}
      >
        {boardId && (
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            sx={{ flex: 1, minHeight: 0, height: { md: "min(70vh, 720px)" } }}
          >
            <Box
              ref={stageRef}
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 360,
                overflow: "auto",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.default",
                display: "grid",
                placeItems: "center",
                position: "relative",
              }}
            >
              {!board && detailQ.isLoading ? (
                <Typography variant="body2" color="text.secondary">
                  Loading canvas…
                </Typography>
              ) : (
                <Box
                  data-mood-canvas
                  onPointerDown={onCanvasPointerDown}
                  onPointerMove={onCanvasPointerMove}
                  onPointerUp={onCanvasPointerUp}
                  onPointerLeave={onCanvasPointerUp}
                  sx={{
                    width: canvasW,
                    height: canvasH,
                    bgcolor: board?.background ?? "#F2F4F7",
                    position: "relative",
                    transform: `scale(${scale})`,
                    transformOrigin: "center center",
                    boxShadow: 1,
                    cursor: tool === "pen" ? "crosshair" : tool === "sticky" ? "cell" : "default",
                    touchAction: "none",
                  }}
                >
                  {localItems.map((item) => {
                    const selectedBorder =
                      selectedId === item.id ? "2px solid #FF4F18" : "1px solid transparent";
                    if (item.kind === "IMAGE") {
                      return (
                        <Box
                          key={item.id}
                          onPointerDown={(e) => startDrag(e, item)}
                          sx={{
                            position: "absolute",
                            left: item.x,
                            top: item.y,
                            width: item.width ?? 360,
                            height: item.height ?? 270,
                            zIndex: item.zIndex,
                            border: selectedBorder,
                            boxSizing: "border-box",
                            overflow: "hidden",
                            bgcolor: "#fff",
                            cursor: tool === "select" ? "grab" : "default",
                            userSelect: "none",
                          }}
                        >
                          {item.url ? (
                            <Box
                              component="img"
                              src={item.url}
                              alt={
                                typeof item.payload.caption === "string"
                                  ? item.payload.caption
                                  : "Moodboard image"
                              }
                              draggable={false}
                              sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <Box sx={{ p: 1 }}>
                              <Typography variant="caption">Image</Typography>
                            </Box>
                          )}
                        </Box>
                      );
                    }
                    if (item.kind === "STICKY") {
                      return (
                        <Box
                          key={item.id}
                          onPointerDown={(e) => startDrag(e, item)}
                          sx={{
                            position: "absolute",
                            left: item.x,
                            top: item.y,
                            width: item.width ?? 180,
                            height: item.height ?? 160,
                            zIndex: item.zIndex,
                            border: selectedBorder,
                            boxSizing: "border-box",
                            bgcolor: payloadColor(item.payload),
                            p: 1,
                            cursor: tool === "select" ? "grab" : "default",
                            boxShadow: "2px 2px 0 rgba(20,21,23,0.08)",
                          }}
                        >
                          {selectedId === item.id ? (
                            <TextField
                              multiline
                              fullWidth
                              variant="standard"
                              value={payloadText(item.payload)}
                              onChange={(ev) => {
                                const text = ev.target.value;
                                setLocalItems((items) =>
                                  items.map((it) =>
                                    it.id === item.id
                                      ? { ...it, payload: { ...it.payload, text } }
                                      : it,
                                  ),
                                );
                              }}
                              onBlur={() => {
                                const current = localItems.find((i) => i.id === item.id);
                                if (!current || !boardId) return;
                                upsertItem.mutate({
                                  moodboardId: boardId,
                                  id: item.id,
                                  kind: "STICKY",
                                  x: current.x,
                                  y: current.y,
                                  width: current.width,
                                  height: current.height,
                                  payload: current.payload,
                                });
                              }}
                              slotProps={{ input: { disableUnderline: true } }}
                              sx={{
                                height: "100%",
                                "& .MuiInputBase-root": { height: "100%", alignItems: "flex-start" },
                                "& textarea": { fontFamily: "Urbanist, sans-serif", fontSize: 14 },
                              }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.35 }}
                            >
                              {payloadText(item.payload) || "Sticky note"}
                            </Typography>
                          )}
                        </Box>
                      );
                    }
                    if (item.kind === "PATH") {
                      const pts = payloadPoints(item.payload);
                      const strokeColor =
                        typeof item.payload.stroke === "string" ? item.payload.stroke : "#141517";
                      const strokeWidth =
                        typeof item.payload.strokeWidth === "number" ? item.payload.strokeWidth : 3;
                      return (
                        <Box
                          key={item.id}
                          onPointerDown={(e) => startDrag(e, item)}
                          sx={{
                            position: "absolute",
                            left: item.x,
                            top: item.y,
                            width: item.width ?? 1,
                            height: item.height ?? 1,
                            zIndex: item.zIndex,
                            border: selectedBorder,
                            boxSizing: "border-box",
                            cursor: tool === "select" ? "grab" : "default",
                            pointerEvents: "auto",
                          }}
                        >
                          <svg
                            width="100%"
                            height="100%"
                            viewBox={`0 0 ${item.width ?? 1} ${item.height ?? 1}`}
                            style={{ display: "block", overflow: "visible" }}
                          >
                            <path
                              d={pathD(pts)}
                              fill="none"
                              stroke={strokeColor}
                              strokeWidth={strokeWidth}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </Box>
                      );
                    }
                    return null;
                  })}

                  {stroke && stroke.points.length > 0 && (
                    <svg
                      width={canvasW}
                      height={canvasH}
                      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
                    >
                      <path
                        d={pathD(stroke.points)}
                        fill="none"
                        stroke="#141517"
                        strokeWidth={3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </Box>
              )}
            </Box>

            <Stack
              spacing={1}
              sx={{
                width: { xs: "100%", md: 320 },
                flexShrink: 0,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                minHeight: 0,
                overflow: "auto",
              }}
            >
              <Box sx={{ px: 2, pt: 2 }}>
                <Typography variant="subtitle2">Discussion</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                  Collaborate on references and markups for this project.
                </Typography>
                {selected && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: "center" }}>
                    <Typography variant="caption">
                      Selected · {selected.kind.toLowerCase()}
                    </Typography>
                    <Button
                      size="small"
                      color="error"
                      onClick={() => deleteItem.mutate({ id: selected.id })}
                    >
                      Delete
                    </Button>
                  </Stack>
                )}
              </Box>
              {selected ? (
                <ContextualComments
                  projectId={projectId}
                  objectType="moodboard_item"
                  objectId={selected.id}
                  heading="Item discussion"
                  description="Notes tied to the selected image, sticky, or drawing."
                />
              ) : (
                <ContextualComments
                  projectId={projectId}
                  objectType="moodboard"
                  objectId={boardId}
                  heading="Board discussion"
                  description="Project-wide conversation for this moodboard."
                />
              )}
            </Stack>
          </Stack>
        )}
      </DataState>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>New moodboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!title.trim() || createBoard.isPending}
            onClick={() => createBoard.mutate({ projectId, title: title.trim() })}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={deleteBoardOpen}
        heading="Delete moodboard?"
        body="This removes the board, all images, stickies, drawings, and related discussion threads."
        confirmText="Delete"
        pending={deleteBoard.isPending}
        onClose={() => setDeleteBoardOpen(false)}
        onConfirm={() => boardId && deleteBoard.mutate({ id: boardId })}
      />
    </Stack>
  );
}
