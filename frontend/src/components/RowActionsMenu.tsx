import { OverflowMenu, OverflowMenuItem } from "@carbon/react";
import { OverflowMenuHorizontal } from "@carbon/icons-react";
import { CarbonScope } from "../carbon/CarbonScope.js";

/**
 * Row actions collapsed into a single "⋯" menu. Wave 3 (Carbon): stock
 * `OverflowMenu`/`OverflowMenuItem` (handles open/close itself; `isDelete` marks
 * destructive actions). Was MUI `IconButton` + `Menu`. Falsy entries are skipped
 * so callers can inline conditionals.
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
  const items = actions.filter(Boolean) as RowAction[];
  if (items.length === 0) return null;
  return (
    <CarbonScope as="span">
      <OverflowMenu
        aria-label={ariaLabel}
        size="sm"
        flipped
        renderIcon={OverflowMenuHorizontal}
        onClick={(e) => e.stopPropagation()}
      >
        {items.map((a, i) => (
          <OverflowMenuItem
            key={a.label}
            itemText={a.label}
            disabled={a.disabled}
            isDelete={a.danger}
            hasDivider={i > 0}
            onClick={() => a.onClick()}
          />
        ))}
      </OverflowMenu>
    </CarbonScope>
  );
}
