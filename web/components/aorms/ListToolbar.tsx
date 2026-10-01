"use client";

import { ContentSwitcher, IconSwitch, Search, Select, SelectItem } from "@carbon/react";
import { Calendar, Dashboard, Grid, List, Menu } from "@carbon/icons-react";

// View-switch icons by option value (label becomes the tooltip).
const VIEW_ICONS: Record<string, React.ElementType> = { cards: Grid, lines: List, board: Dashboard, calendar: Calendar };

export type ToolbarOption = { value: string; label: string };
export type ToolbarSelect = {
  id: string;
  label: string;
  value: string;
  options: ToolbarOption[];
  onChange: (value: string) => void;
};

/**
 * The one control bar for every list screen (2026-10-01): search, filters,
 * sort and the view switch live in a single component, in a fixed order —
 * [ search ........ ] [ filters ] [ sort ] [ view ] — followed by a status line
 * ("Showing X of Y", quick actions, reset). Projects, Tasks and every table
 * screen (via TableToolbar) render this same bar, so the controls are in the same
 * place and behave the same everywhere. Purely presentational and controlled:
 * the screen owns the state and the data.
 */
export function ListToolbar({
  search,
  filters = [],
  extra,
  sort,
  view,
  status,
  actions,
  label = "Search, filter and sort",
}: {
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  filters?: ToolbarSelect[];
  /** Inline extras that belong with the filters (e.g. a custom date range). */
  extra?: React.ReactNode;
  sort?: ToolbarSelect;
  view?: { value: string; options: ToolbarOption[]; onChange: (v: string) => void };
  status?: React.ReactNode;
  actions?: React.ReactNode;
  label?: string;
}) {
  return (
    <div className="aorms-toolbar" role="search" aria-label={label}>
      <div className="aorms-toolbar__row">
        {search && (
          <div className="aorms-toolbar__search">
            <Search
              size="sm"
              labelText="Search"
              placeholder={search.placeholder ?? "Search"}
              value={search.value}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => search.onChange(e.target.value)}
              onClear={() => search.onChange("")}
              closeButtonLabelText="Clear search"
            />
          </div>
        )}
        {filters.map((f) => (
          <div className="aorms-toolbar__select" key={f.id}>
            <Select id={f.id} size="sm" labelText={f.label} hideLabel value={f.value} onChange={(e) => f.onChange(e.target.value)}>
              {f.options.map((o) => (
                <SelectItem key={o.value} value={o.value} text={o.label} />
              ))}
            </Select>
          </div>
        ))}
        {extra}
        {sort && (
          <div className="aorms-toolbar__select">
            <Select id={sort.id} size="sm" labelText={sort.label} hideLabel value={sort.value} onChange={(e) => sort.onChange(e.target.value)}>
              {sort.options.map((o) => (
                <SelectItem key={o.value} value={o.value} text={`Sort: ${o.label}`} />
              ))}
            </Select>
          </div>
        )}
        {view && (
          <div className="aorms-toolbar__view">
            <ContentSwitcher
              size="sm"
              selectedIndex={Math.max(0, view.options.findIndex((o) => o.value === view.value))}
              onChange={(e) => view.onChange(String(e.name))}
            >
              {view.options.map((o) => (
                <IconSwitch key={o.value} name={o.value} text={o.label}>
                  {(() => { const I = VIEW_ICONS[o.value] ?? Menu; return <I />; })()}
                </IconSwitch>
              ))}
            </ContentSwitcher>
          </div>
        )}
        {(status || actions) && (
          <div className="aorms-toolbar__status" aria-live="polite">
            {status && <span className="cds--type-helper-text-01" style={{ color: "var(--cds-text-secondary)" }}>{status}</span>}
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
