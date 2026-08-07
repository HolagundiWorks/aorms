import MoreHoriz from "@mui/icons-material/MoreHoriz";
import { IconButton, ListItemText, Menu, MenuItem } from "@mui/material";
import { chromeIconSx } from "@hcw/ui-kit";
import { useId, useState } from "react";

/**
 * Row actions collapsed into a single "⋯" menu (MUI + kit chrome hit target).
 * Falsy entries are skipped so callers can inline conditionals.
 */
export type RowAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

export function RowActionsMenu({
  actions,
  ariaLabel = "Row actions",
}: {
  actions: Array<RowAction | false | null | undefined>;
  ariaLabel?: string;
}) {
  const menuId = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const items = actions.filter(Boolean) as RowAction[];
  if (items.length === 0) return null;

  const open = Boolean(anchor);

  return (
    <>
      <IconButton
        size="small"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setAnchor(e.currentTarget);
        }}
        sx={chromeIconSx}
      >
        <MoreHoriz fontSize="small" />
      </IconButton>
      <Menu
        id={menuId}
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((a, i) => (
          <MenuItem
            key={a.label}
            disabled={a.disabled}
            divider={i < items.length - 1}
            onClick={() => {
              setAnchor(null);
              a.onClick();
            }}
            sx={a.danger ? { color: "error.main" } : undefined}
          >
            <ListItemText>{a.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
