import MenuOutlined from "@mui/icons-material/MenuOutlined";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  Box,
  Button,
  Divider,
  IconButton,
  InputAdornment,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { Surface, RADIUS, chromeIconSx } from "@hcw/ui-kit";
import { useCallback, useRef, useState, type ComponentType, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AormsMark } from "../AormsLogo.js";
import { AlertsBell } from "../AlertsBell.js";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";
import { useAuth } from "../../lib/auth.js";
import { AORMS_PLATFORM } from "../../lib/product-nomenclature.js";
import { PORTAL_CHROME } from "../../lib/portal-chrome.js";
import { OfficeHealthGlyph } from "./OfficeHealthGlyph.js";
import { useOfficeHealth } from "./useOfficeHealth.js";

/**
 * Top chrome — brand · search bar · dues · alerts · username → /account.
 * Module nav lives in the bottom taskbar ({@link RibbonNavCluster}).
 */
export type RibbonLink = { label: string; to: string; icon?: ComponentType<any> };
export type RibbonNode =
  | (RibbonLink & { kind?: "link" })
  | { kind: "menu"; label: string; icon?: ComponentType<any>; items: RibbonNode[] };

export type AdminGroup = { heading: string; items: { label: string; to: string; icon?: ComponentType<any> }[] };

const HOVER_CLOSE_MS = 120;
const ADMIN_MENU_ID = "__admin__";

function leaves(node: RibbonNode): RibbonLink[] {
  return "items" in node ? node.items.flatMap(leaves) : [node];
}

function pathActive(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

const navSx = (active: boolean) => ({
  textTransform: "none" as const,
  minHeight: PORTAL_CHROME.footerHitPx,
  minWidth: 44,
  px: 1.25,
  borderRadius: `${RADIUS}px`,
  color: active ? "primary.main" : "text.secondary",
  borderBottom: "2px solid",
  borderBottomColor: active ? "primary.main" : "transparent",
  "&:hover": {
    backgroundColor: "action.hover",
    borderBottomColor: active ? "primary.main" : "divider",
    color: "primary.main",
  },
});

type OpenMode = "hover" | "focus";
type MenuPlacement = "above" | "below";

const hoverMenuExtras = (onEnter: () => void, onLeave: () => void) => ({
  hideBackdrop: true,
  disableAutoFocus: true,
  disableEnforceFocus: true,
  disableRestoreFocus: true,
  disableScrollLock: true,
  sx: { pointerEvents: "none" as const },
  slotProps: {
    paper: {
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      sx: { pointerEvents: "auto", mt: 0.25, minWidth: 180 },
    },
    list: { sx: { py: 0.5 } },
  },
});

const focusMenuExtras = (onEnter: () => void, onLeave: () => void, labelledBy: string) => ({
  hideBackdrop: true,
  disableAutoFocus: false,
  disableEnforceFocus: false,
  disableRestoreFocus: false,
  disableScrollLock: true,
  sx: { pointerEvents: "none" as const },
  slotProps: {
    paper: {
      onMouseEnter: onEnter,
      onMouseLeave: onLeave,
      sx: { pointerEvents: "auto", mt: 0.25, minWidth: 180 },
    },
    list: {
      sx: { py: 0.5 },
      "aria-labelledby": labelledBy,
      autoFocusItem: true,
    },
  },
});

function useRibbonMenu() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<OpenMode>("hover");
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  const scheduleClose = useCallback(() => {
    if (mode === "focus") return;
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenId(null), HOVER_CLOSE_MS);
  }, [cancelClose, mode]);

  const openHover = useCallback((id: string) => {
    cancelClose();
    setMode("hover");
    setOpenId(id);
  }, [cancelClose]);

  const toggleFocus = useCallback((id: string) => {
    cancelClose();
    setOpenId((prev) => {
      if (prev === id) {
        setMode("hover");
        return null;
      }
      setMode("focus");
      return id;
    });
  }, [cancelClose]);

  const closeMenu = useCallback(() => {
    cancelClose();
    setOpenId(null);
    setMode("hover");
  }, [cancelClose]);

  return { openId, mode, openHover, toggleFocus, closeMenu, cancelClose, scheduleClose };
}

function RibbonMenu({
  menuId,
  openId,
  mode,
  anchorEl,
  onTriggerEnter,
  onTriggerLeave,
  onMenuEnter,
  onMenuLeave,
  onClose,
  anchorOrigin = { vertical: "bottom", horizontal: "left" },
  transformOrigin = { vertical: "top", horizontal: "left" },
  trigger,
  children,
}: {
  menuId: string;
  openId: string | null;
  mode: OpenMode;
  anchorEl: HTMLElement | null;
  onTriggerEnter: () => void;
  onTriggerLeave: () => void;
  onMenuEnter: () => void;
  onMenuLeave: () => void;
  onClose: () => void;
  anchorOrigin?: { vertical: "bottom" | "top" | "center"; horizontal: "left" | "right" | "center" };
  transformOrigin?: { vertical: "bottom" | "top" | "center"; horizontal: "left" | "right" | "center" };
  trigger: ReactNode;
  children: ReactNode;
}) {
  const open = openId === menuId && Boolean(anchorEl);
  const labelledBy = `ribbon-trigger-${menuId}`;
  const extras =
    mode === "focus"
      ? focusMenuExtras(onMenuEnter, onMenuLeave, labelledBy)
      : hoverMenuExtras(onMenuEnter, onMenuLeave);

  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", verticalAlign: "middle" }}
      onMouseEnter={onTriggerEnter}
      onMouseLeave={onTriggerLeave}
    >
      {trigger}
      <Menu
        id={`ribbon-menu-${menuId}`}
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        {...extras}
      >
        {children}
      </Menu>
    </Box>
  );
}

function SectionMenu({
  node,
  menuId,
  openId,
  mode,
  openHover,
  toggleFocus,
  closeMenu,
  cancelClose,
  scheduleClose,
  placement = "below",
}: {
  node: Extract<RibbonNode, { kind: "menu" }>;
  menuId: string;
  openId: string | null;
  mode: OpenMode;
  openHover: (id: string) => void;
  toggleFocus: (id: string) => void;
  closeMenu: () => void;
  cancelClose: () => void;
  scheduleClose: () => void;
  placement?: MenuPlacement;
}) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const btnRef = useRef<HTMLButtonElement>(null);
  const items = leaves(node);
  const active = items.some((l) => pathActive(pathname, l.to));
  const go = (to: string) => {
    closeMenu();
    navigate(to);
  };
  const isOpen = openId === menuId;
  const above = placement === "above";

  return (
    <RibbonMenu
      menuId={menuId}
      openId={openId}
      mode={mode}
      anchorEl={btnRef.current}
      onTriggerEnter={() => openHover(menuId)}
      onTriggerLeave={scheduleClose}
      onMenuEnter={cancelClose}
      onMenuLeave={scheduleClose}
      onClose={closeMenu}
      anchorOrigin={{ vertical: above ? "top" : "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: above ? "bottom" : "top", horizontal: "left" }}
      trigger={(
        <Button
          id={`ribbon-trigger-${menuId}`}
          ref={btnRef}
          variant="text"
          color="inherit"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `ribbon-menu-${menuId}` : undefined}
          onClick={() => toggleFocus(menuId)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!isOpen) toggleFocus(menuId);
            }
          }}
          sx={navSx(active)}
        >
          {node.label}
        </Button>
      )}
    >
      {node.items.some((c) => "items" in c)
        ? node.items.flatMap((child, gi) => {
            if (!("items" in child)) {
              return [
                <MenuItem
                  key={child.to}
                  selected={pathActive(pathname, child.to)}
                  onClick={() => go(child.to)}
                >
                  {child.label}
                </MenuItem>,
              ];
            }
            const ls = leaves(child);
            return [
              ...(gi > 0 ? [<Divider key={`d-${child.label}`} />] : []),
              <ListSubheader
                key={`h-${child.label}`}
                disableSticky
                sx={{ bgcolor: "transparent", lineHeight: 2.2 }}
              >
                {child.label}
              </ListSubheader>,
              ...ls.map((it, ii) => (
                <MenuItem
                  key={it.to}
                  selected={pathActive(pathname, it.to)}
                  onClick={() => go(it.to)}
                  sx={{
                    borderBottom: ii < ls.length - 1 ? 1 : 0,
                    borderColor: "divider",
                  }}
                >
                  {it.label}
                </MenuItem>
              )),
            ];
          })
        : items.map((it, i) => (
            <MenuItem
              key={it.to}
              selected={pathActive(pathname, it.to)}
              onClick={() => go(it.to)}
              sx={{
                borderBottom: i < items.length - 1 ? 1 : 0,
                borderColor: "divider",
              }}
            >
              {it.label}
            </MenuItem>
          ))}
    </RibbonMenu>
  );
}

function AdminMenu({
  groups,
  menuId,
  openId,
  mode,
  openHover,
  toggleFocus,
  closeMenu,
  cancelClose,
  scheduleClose,
  placement = "below",
}: {
  groups: AdminGroup[];
  menuId: string;
  openId: string | null;
  mode: OpenMode;
  openHover: (id: string) => void;
  toggleFocus: (id: string) => void;
  closeMenu: () => void;
  cancelClose: () => void;
  scheduleClose: () => void;
  placement?: MenuPlacement;
}) {
  const navigate = useNavigate();
  const btnRef = useRef<HTMLButtonElement>(null);
  const go = (to: string) => {
    closeMenu();
    navigate(to);
  };
  const isOpen = openId === menuId;
  const above = placement === "above";

  if (groups.length === 0) return null;

  return (
    <RibbonMenu
      menuId={menuId}
      openId={openId}
      mode={mode}
      anchorEl={btnRef.current}
      onTriggerEnter={() => openHover(menuId)}
      onTriggerLeave={scheduleClose}
      onMenuEnter={cancelClose}
      onMenuLeave={scheduleClose}
      onClose={closeMenu}
      anchorOrigin={{ vertical: above ? "top" : "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: above ? "bottom" : "top", horizontal: "right" }}
      trigger={(
        <Tooltip title="Admin · Library · Third Parties" disableHoverListener={isOpen}>
          <IconButton
            id={`ribbon-trigger-${menuId}`}
            ref={btnRef}
            aria-label="Admin menu"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={isOpen ? `ribbon-menu-${menuId}` : undefined}
            onClick={() => toggleFocus(menuId)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (!isOpen) toggleFocus(menuId);
              }
            }}
            sx={{ ml: 0.5, ...chromeIconSx, width: PORTAL_CHROME.footerHitPx, height: PORTAL_CHROME.footerHitPx }}
          >
            <MenuOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    >
      {groups.flatMap((g, gi) => [
        ...(gi > 0 ? [<Divider key={`d-${g.heading}`} />] : []),
        <ListSubheader key={`h-${g.heading}`} disableSticky sx={{ bgcolor: "transparent", lineHeight: 2.2 }}>
          {g.heading}
        </ListSubheader>,
        ...g.items.map((it, ii) => (
          <MenuItem
            key={it.to}
            onClick={() => go(it.to)}
            sx={{
              borderBottom: ii < g.items.length - 1 ? 1 : 0,
              borderColor: "divider",
            }}
          >
            {it.label}
          </MenuItem>
        )),
      ])}
    </RibbonMenu>
  );
}

/** Module nav cluster for the bottom taskbar (menus open upward). */
export function RibbonNavCluster({
  nav,
  adminGroups = [],
  placement = "above",
}: {
  nav: RibbonNode[];
  adminGroups?: AdminGroup[];
  placement?: MenuPlacement;
}) {
  const { pathname } = useLocation();
  const { openId, mode, openHover, toggleFocus, closeMenu, cancelClose, scheduleClose } =
    useRibbonMenu();

  const closeMenus = () => {
    cancelClose();
    closeMenu();
  };

  return (
    <Stack
      direction="row"
      spacing={0.25}
      sx={{ alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
      role="navigation"
      aria-label="Main navigation"
    >
      {nav.map((n) =>
        "items" in n ? (
          <SectionMenu
            key={n.label}
            node={n}
            menuId={n.label}
            openId={openId}
            mode={mode}
            openHover={openHover}
            toggleFocus={toggleFocus}
            closeMenu={closeMenu}
            cancelClose={cancelClose}
            scheduleClose={scheduleClose}
            placement={placement}
          />
        ) : (
          <Button
            key={n.label}
            component={Link}
            to={n.to}
            variant="text"
            color="inherit"
            aria-current={pathActive(pathname, n.to) ? "page" : undefined}
            onMouseEnter={closeMenus}
            sx={navSx(pathActive(pathname, n.to))}
          >
            {n.label}
          </Button>
        ),
      )}
      <AdminMenu
        groups={adminGroups}
        menuId={ADMIN_MENU_ID}
        openId={openId}
        mode={mode}
        openHover={openHover}
        toggleFocus={toggleFocus}
        closeMenu={closeMenu}
        cancelClose={cancelClose}
        scheduleClose={scheduleClose}
        placement={placement}
      />
    </Stack>
  );
}

/**
 * Staff top bar — brand · search · dues · notifications · username (→ /account).
 */
export function AppRibbon({
  firmName,
  variant: _variant = "bar",
}: {
  /** @deprecated Nav moved to bottom taskbar — ignored. */
  nav?: RibbonNode[];
  firmName: string;
  /** @deprecated Nav moved to bottom taskbar — ignored. */
  adminGroups?: AdminGroup[];
  /** @deprecated Always renders soft bar. */
  variant?: "bar" | "float";
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { state, pendingTasks, overdueInvoices } = useOfficeHealth();
  const [q, setQ] = useState("");
  const fullName = user?.fullName?.trim() || "";
  const firstName =
    (fullName ? fullName.split(/\s+/)[0] : "") || user?.email || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingLabel = `${greeting}, ${firstName}`;
  const duesParts = [
    pendingTasks > 0 ? `${pendingTasks} due` : null,
    overdueInvoices > 0 ? `${overdueInvoices} overdue` : null,
  ].filter(Boolean);
  const duesLabel = duesParts.join(" · ");

  function runSearch(value = q) {
    const trimmed = value.trim();
    if (trimmed.length < 2) {
      navigate("/search");
      return;
    }
    navigate(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  return (
    <Box
      className="esti-ribbon-wrap"
      sx={{
        position: "sticky",
        top: COMPOSITION_RHYTHM.chromeInsetMd * 8,
        zIndex: 1100,
        width: "100%",
        px: { xs: COMPOSITION_RHYTHM.sm, md: COMPOSITION_RHYTHM.md },
        mt: COMPOSITION_RHYTHM.sm,
        mb: COMPOSITION_RHYTHM.xs,
        boxSizing: "border-box",
        flexShrink: 0,
      }}
    >
      <Surface
        layer="soft"
        component="header"
        className="hcw-surface esti-ribbon"
        aria-label="Workspace header"
        sx={{
          borderRadius: `${RADIUS}px`,
          minHeight: 56,
          px: COMPOSITION_RHYTHM.headerPad,
          py: COMPOSITION_RHYTHM.xs,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          className="esti-ribbon__brand"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: COMPOSITION_RHYTHM.xs,
            minWidth: 0,
            maxWidth: { xs: 140, md: 220 },
            flexShrink: 0,
          }}
        >
          <AormsMark size="md" className="esti-ribbon__mark" />
          <h1 className="esti-ribbon__title" title={firmName || AORMS_PLATFORM.name}>
            {firmName || AORMS_PLATFORM.name}
          </h1>
        </Box>

        <TextField
          size="small"
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          aria-label="Search"
          sx={{
            flex: 1,
            minWidth: 120,
            maxWidth: 480,
            "& .MuiOutlinedInput-root": { borderRadius: `${RADIUS}px` },
          }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlined fontSize="small" color="action" />
                </InputAdornment>
              ),
            },
          }}
        />

        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", flexShrink: 0, ml: "auto" }}
        >
          <Tooltip title={`Office health: ${state}${duesLabel ? ` · ${duesLabel}` : ""}`}>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{
                alignItems: "center",
                cursor: "pointer",
                minHeight: 36,
                px: 0.5,
              }}
              onClick={() => navigate(duesLabel ? "/tasks" : "/")}
              role="link"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  navigate(duesLabel ? "/tasks" : "/");
                }
              }}
              aria-label={`Office health: ${state}${duesLabel ? `. ${duesLabel}` : ""}`}
            >
              <OfficeHealthGlyph state={state} title={state} />
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ textTransform: "capitalize" }}
              >
                {state}
                {duesLabel ? ` · ${duesLabel}` : ""}
              </Typography>
            </Stack>
          </Tooltip>
          <Tooltip title="Account portal">
            <Button
              size="small"
              variant="text"
              color="inherit"
              onClick={() => navigate("/account")}
              aria-label={`${greetingLabel} — open account portal`}
              sx={{
                textTransform: "none",
                minHeight: 36,
                px: 1,
                maxWidth: { xs: 160, md: 280 },
              }}
            >
              <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                {greetingLabel}
              </Typography>
            </Button>
          </Tooltip>
          <AlertsBell />
        </Stack>
      </Surface>
    </Box>
  );
}
