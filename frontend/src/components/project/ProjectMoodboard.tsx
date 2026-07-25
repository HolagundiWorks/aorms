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
import ArrowDownwardOutlinedIcon from "@mui/icons-material/ArrowDownwardOutlined";
import ArrowUpwardOutlinedIcon from "@mui/icons-material/ArrowUpwardOutlined";
import DeleteIcon from "@mui/icons-material/Delete";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FitScreenIcon from "@mui/icons-material/FitScreen";
import GestureOutlinedIcon from "@mui/icons-material/GestureOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import NearMeOutlinedIcon from "@mui/icons-material/NearMeOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import { STICKY_NOTE_COLORS } from "@esti/contracts";
import { pushToast, useScreenActions } from "@hcw/ui-kit";
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
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

type ResizeState = {
  id: string;
  startX: number;
  startY: number;
  origW: number;
  origH: number;
};

type StrokeState = {
  points: { x: number; y: number }[];
};

const PEN_COLORS = ["#141517", "#FF4F18", "#1565C0", "#2E7D32"] as const;
const MIN_ITEM = 48;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;

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
      !!p &&
      typeof p === "object" &&
      typeof (p as { x: unknown }).x === "number" &&
      typeof (p as { y: unknown }).y === "number",
  );
}

function pathD(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(" ");
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
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
  const [renameOpen, setRenameOpen] = useState(false);
  const [title, setTitle] = useState("Moodboard");
  const [renameTitle, setRenameTitle] = useState("");
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [tool, setTool] = useState<Tool>("select");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stickyColor, setStickyColor] = useState<string>(STICKY_NOTE_COLORS[0]);
  const [penColor, setPenColor] = useState<string>(PEN_COLORS[0]);
  const [localItems, setLocalItems] = useState<CanvasItem[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);
  const [stroke, setStroke] = useState<StrokeState | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [fitScale, setFitScale] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [uploading, setUploading] = useState(false);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const localItemsRef = useRef<CanvasItem[]>([]);
  const interactRef = useRef(false);

  const detailQ = trpc.moodboard.byId.useQuery(
    { id: boardId! },
    { enabled: !!boardId, refetchInterval: 15_000 },
  );

  useEffect(() => {
    localItemsRef.current = localItems;
  }, [localItems]);

  useEffect(() => {
    interactRef.current = !!(drag || resize || stroke || editingStickyId);
  }, [drag, resize, stroke, editingStickyId]);

  useEffect(() => {
    if (!boardId && listQ.data && listQ.data.length > 0) {
      setBoardId(listQ.data[0]!.id);
    }
  }, [boardId, listQ.data]);

  // Avoid clobbering in-progress drag / resize / pen / sticky edits on poll.
  useEffect(() => {
    if (!detailQ.data?.items) return;
    if (interactRef.current) return;
    setLocalItems(detailQ.data.items as CanvasItem[]);
  }, [detailQ.data?.items]);

  const board = detailQ.data?.board;
  const canvasW = board?.canvasWidth ?? 1920;
  const canvasH = board?.canvasHeight ?? 1080;
  const scale = fitScale * zoom;

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const update = () => {
      const pad = 24;
      const availW = Math.max(320, el.clientWidth - pad);
      const availH = Math.max(240, el.clientHeight - pad);
      setFitScale(Math.min(1, availW / canvasW, availH / canvasH));
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

  const updateBoard = trpc.moodboard.update.useMutation({
    meta: { errorTitle: "Couldn't rename moodboard" },
    onSuccess: async () => {
      pushToast({ kind: "success", title: "Moodboard renamed" });
      setRenameOpen(false);
      await utils.moodboard.listByProject.invalidate({ projectId });
      if (boardId) await utils.moodboard.byId.invalidate({ id: boardId });
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
      setEditingStickyId(null);
      if (boardId) await utils.moodboard.byId.invalidate({ id: boardId });
    },
  });

  useScreenActions(
    createOpen || deleteBoardOpen || renameOpen
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
    [boardId, createOpen, deleteBoardOpen, renameOpen],
  );

  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (isEditableTarget(e.target)) return;
    if (!boardId) return;
    if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
      e.preventDefault();
      deleteItem.mutate({ id: selectedId });
      return;
    }
    if (e.key === "Escape") {
      setSelectedId(null);
      setEditingStickyId(null);
      setTool("select");
      return;
    }
    if ((e.key === "+" || e.key === "=") && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + 0.1) * 10) / 10));
    }
    if (e.key === "-" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - 0.1) * 10) / 10));
    }
    if (e.key === "0" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setZoom(1);
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  function stagePoint(e: ReactPointerEvent): { x: number; y: number } {
    const stage = stageRef.current?.querySelector("[data-mood-canvas]") as HTMLElement | null;
    if (!stage) return { x: 0, y: 0 };
    const rect = stage.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  }

  async function uploadImages(files: FileList | File[]) {
    if (!boardId) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setUploading(true);
    let ok = 0;
    try {
      for (const file of list) {
        const res = await authorizedFetch("/upload/mood-image", (fd) => {
          fd.append("moodboardId", boardId);
          fd.append("file", file);
        });
        if (res.ok) ok += 1;
      }
      if (ok === 0) {
        pushToast({ kind: "error", title: "Image upload failed" });
      } else {
        pushToast({
          kind: "success",
          title: ok === 1 ? "Image added" : `${ok} images added`,
        });
        await utils.moodboard.byId.invalidate({ id: boardId });
      }
      setTool("select");
    } finally {
      setUploading(false);
    }
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
      setEditingStickyId(null);
    }
  }

  function onCanvasPointerMove(e: ReactPointerEvent) {
    const pt = stagePoint(e);
    if (stroke) {
      setStroke({ points: [...stroke.points, pt] });
      return;
    }
    if (resize) {
      const dw = pt.x - resize.startX;
      const dh = pt.y - resize.startY;
      setLocalItems((items) =>
        items.map((it) =>
          it.id === resize.id
            ? {
                ...it,
                width: Math.max(MIN_ITEM, resize.origW + dw),
                height: Math.max(MIN_ITEM, resize.origH + dh),
              }
            : it,
        ),
      );
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
        payload: { points: localPts, stroke: penColor, strokeWidth: 3 },
      });
      setStroke(null);
      setTool("select");
      return;
    }
    setStroke(null);

    if (resize) {
      const item = localItemsRef.current.find((i) => i.id === resize.id);
      if (item) {
        updateTransform.mutate({
          id: item.id,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        });
      }
      setResize(null);
      return;
    }

    if (drag) {
      const item = localItemsRef.current.find((i) => i.id === drag.id);
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

  function startResize(e: ReactPointerEvent, item: CanvasItem) {
    if (tool !== "select") return;
    e.stopPropagation();
    setSelectedId(item.id);
    const pt = stagePoint(e);
    setResize({
      id: item.id,
      startX: pt.x,
      startY: pt.y,
      origW: item.width ?? MIN_ITEM,
      origH: item.height ?? MIN_ITEM,
    });
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function bumpZ(direction: 1 | -1) {
    if (!selectedId) return;
    const items = localItemsRef.current;
    const current = items.find((i) => i.id === selectedId);
    if (!current) return;
    const zs = items.map((i) => i.zIndex);
    const nextZ =
      direction === 1 ? Math.max(...zs, 0) + 1 : Math.min(...zs, 0) - 1;
    setLocalItems((rows) =>
      rows.map((r) => (r.id === selectedId ? { ...r, zIndex: nextZ } : r)),
    );
    updateTransform.mutate({
      id: selectedId,
      x: current.x,
      y: current.y,
      zIndex: nextZ,
    });
  }

  function applyStickyColor(color: string) {
    setStickyColor(color);
    if (!boardId || !selected || selected.kind !== "STICKY") return;
    const nextPayload = { ...selected.payload, color };
    setLocalItems((items) =>
      items.map((it) => (it.id === selected.id ? { ...it, payload: nextPayload } : it)),
    );
    upsertItem.mutate({
      moodboardId: boardId,
      id: selected.id,
      kind: "STICKY",
      x: selected.x,
      y: selected.y,
      width: selected.width,
      height: selected.height,
      payload: nextPayload,
    });
  }

  function persistSticky(id: string) {
    const current = localItemsRef.current.find((i) => i.id === id);
    if (!current || !boardId) return;
    upsertItem.mutate({
      moodboardId: boardId,
      id,
      kind: "STICKY",
      x: current.x,
      y: current.y,
      width: current.width,
      height: current.height,
      payload: current.payload,
    });
    setEditingStickyId(null);
  }

  const selected = localItems.find((i) => i.id === selectedId) ?? null;
  const boards = listQ.data ?? [];
  const showStickyColors = tool === "sticky" || selected?.kind === "STICKY";
  const showPenColors = tool === "pen";

  function resizeHandle(item: CanvasItem) {
    if (selectedId !== item.id || tool !== "select") return null;
    return (
      <Box
        onPointerDown={(e) => startResize(e, item)}
        aria-label="Resize"
        sx={{
          position: "absolute",
          right: -5,
          bottom: -5,
          width: 12,
          height: 12,
          bgcolor: "#FF4F18",
          border: "1px solid #fff",
          borderRadius: 0.25,
          cursor: "nwse-resize",
          zIndex: 2,
        }}
      />
    );
  }

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
            setEditingStickyId(null);
            setZoom(1);
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
        {boardId && board && (
          <Tooltip title="Rename board">
            <IconButton
              aria-label="Rename moodboard"
              size="small"
              onClick={() => {
                setRenameTitle(board.title);
                setRenameOpen(true);
              }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
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
          <Stack direction="row" spacing={0.25} sx={{ alignItems: "center" }}>
            <Tooltip title="Zoom out">
              <span>
                <IconButton
                  size="small"
                  aria-label="Zoom out"
                  disabled={zoom <= ZOOM_MIN}
                  onClick={() => setZoom((z) => Math.max(ZOOM_MIN, Math.round((z - 0.1) * 10) / 10))}
                >
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Typography variant="caption" sx={{ minWidth: 40, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </Typography>
            <Tooltip title="Zoom in">
              <span>
                <IconButton
                  size="small"
                  aria-label="Zoom in"
                  disabled={zoom >= ZOOM_MAX}
                  onClick={() => setZoom((z) => Math.min(ZOOM_MAX, Math.round((z + 0.1) * 10) / 10))}
                >
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Fit to view">
              <IconButton size="small" aria-label="Fit to view" onClick={() => setZoom(1)}>
                <FitScreenIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
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
            <ToggleButton value="image" aria-label="Import image" disabled={uploading}>
              <Tooltip title={uploading ? "Uploading…" : "Import images"}>
                <ImageOutlinedIcon fontSize="small" />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = e.target.files;
            e.target.value = "";
            if (files?.length) void uploadImages(files);
          }}
        />
      </Stack>

      {showStickyColors && (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            {selected?.kind === "STICKY"
              ? "Sticky colour"
              : "Sticky colour — click the canvas to place"}
          </Typography>
          {STICKY_NOTE_COLORS.map((c) => (
            <Box
              key={c}
              component="button"
              type="button"
              aria-label={`Sticky colour ${c}`}
              onClick={() => applyStickyColor(c)}
              sx={{
                width: 18,
                height: 18,
                borderRadius: 0.5,
                border: stickyColor === c || payloadColor(selected?.payload ?? {}) === c
                  ? "2px solid"
                  : "1px solid",
                borderColor:
                  stickyColor === c || (selected?.kind === "STICKY" && payloadColor(selected.payload) === c)
                    ? "text.primary"
                    : "divider",
                bgcolor: c,
                p: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </Stack>
      )}

      {showPenColors && (
        <Stack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          <Typography variant="caption" color="text.secondary">
            Pen colour — drag on the canvas
          </Typography>
          {PEN_COLORS.map((c) => (
            <Box
              key={c}
              component="button"
              type="button"
              aria-label={`Pen colour ${c}`}
              onClick={() => setPenColor(c)}
              sx={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                border: penColor === c ? "2px solid" : "1px solid",
                borderColor: penColor === c ? "text.primary" : "divider",
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
                            overflow: "visible",
                            bgcolor: "#fff",
                            cursor: tool === "select" ? "grab" : "default",
                            userSelect: "none",
                          }}
                        >
                          <Box
                            sx={{
                              width: "100%",
                              height: "100%",
                              overflow: "hidden",
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
                                sx={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                  pointerEvents: "none",
                                }}
                              />
                            ) : (
                              <Box sx={{ p: 1 }}>
                                <Typography variant="caption">Image</Typography>
                              </Box>
                            )}
                          </Box>
                          {resizeHandle(item)}
                        </Box>
                      );
                    }
                    if (item.kind === "STICKY") {
                      const editing = editingStickyId === item.id;
                      return (
                        <Box
                          key={item.id}
                          onPointerDown={(e) => {
                            if (editing) {
                              e.stopPropagation();
                              setSelectedId(item.id);
                              return;
                            }
                            startDrag(e, item);
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            setSelectedId(item.id);
                            setEditingStickyId(item.id);
                          }}
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
                            cursor: tool === "select" ? (editing ? "text" : "grab") : "default",
                            boxShadow: "2px 2px 0 rgba(20,21,23,0.08)",
                            overflow: "visible",
                          }}
                        >
                          {editing ? (
                            <TextField
                              autoFocus
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
                              onBlur={() => persistSticky(item.id)}
                              slotProps={{ input: { disableUnderline: true } }}
                              sx={{
                                height: "100%",
                                "& .MuiInputBase-root": {
                                  height: "100%",
                                  alignItems: "flex-start",
                                },
                                "& textarea": {
                                  fontFamily: "Urbanist, sans-serif",
                                  fontSize: 14,
                                },
                              }}
                            />
                          ) : (
                            <Typography
                              variant="body2"
                              sx={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.35 }}
                            >
                              {payloadText(item.payload) || "Double-click to edit"}
                            </Typography>
                          )}
                          {resizeHandle(item)}
                        </Box>
                      );
                    }
                    if (item.kind === "PATH") {
                      const pts = payloadPoints(item.payload);
                      const strokeColor =
                        typeof item.payload.stroke === "string" ? item.payload.stroke : "#141517";
                      const strokeWidth =
                        typeof item.payload.strokeWidth === "number"
                          ? item.payload.strokeWidth
                          : 3;
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
                        stroke={penColor}
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
                  <Stack spacing={0.75} sx={{ mt: 1 }}>
                    <Typography variant="caption">
                      Selected · {selected.kind.toLowerCase()}
                    </Typography>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap" }}>
                      <Tooltip title="Bring forward">
                        <IconButton size="small" aria-label="Bring forward" onClick={() => bumpZ(1)}>
                          <ArrowUpwardOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Send backward">
                        <IconButton
                          size="small"
                          aria-label="Send backward"
                          onClick={() => bumpZ(-1)}
                        >
                          <ArrowDownwardOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Button
                        size="small"
                        color="error"
                        onClick={() => deleteItem.mutate({ id: selected.id })}
                      >
                        Delete
                      </Button>
                    </Stack>
                    <Typography variant="caption" color="text.secondary">
                      Delete / Esc · Ctrl/⌘ ± zoom
                    </Typography>
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

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Rename moodboard</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Title"
            value={renameTitle}
            onChange={(e) => setRenameTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!renameTitle.trim() || !boardId || updateBoard.isPending}
            onClick={() =>
              boardId && updateBoard.mutate({ id: boardId, title: renameTitle.trim() })
            }
          >
            Save
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
