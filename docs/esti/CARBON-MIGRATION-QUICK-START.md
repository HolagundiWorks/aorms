# Carbon Migration — Quick Start Guide

**For developers migrating files from MUI/HCW to Carbon.**

---

## Before You Start

### Prerequisites

- ✅ Wave 2 adapters are available in `frontend/src/carbon/adapters/`
- ✅ `CarbonScope.tsx` is set up for per-subtree theming
- ✅ `carbon-tree.scss` includes all active components
- ✅ Read [`CARBON-MIGRATION.md`](./CARBON-MIGRATION.md) § 0 (pure Carbon rule)

### Dependencies to install (already done)

```bash
pnpm add @carbon/react @carbon/styles @carbon/icons-react
```

---

## Step-by-Step Migration Recipe

### 1. Audit the file

```bash
# In your editor, find all MUI/kit imports:
grep -E "@hcw/ui-kit|@mui/material|@mui/icons-material" frontend/src/components/MyComponent.tsx
```

**Example output:**
```
import { Box, Typography, TextField } from '@mui/material';
import { StatusDot, DataState } from '@hcw/ui-kit';
import { ChevronRight } from '@mui/icons-material';
```

### 2. Swap kit primitives → Carbon adapters

**Old:**
```tsx
import { StatusDot, DataState, ConfirmModal, PageBreadcrumb } from '@hcw/ui-kit';
```

**New:**
```tsx
import { 
  StatusDot, 
  DataState, 
  ConfirmModal, 
  PageBreadcrumb 
} from '../carbon/adapters';
```

**Mapping guide:**

| Kit primitive | Carbon adapter | Location |
|---|---|---|
| `StatusDot` | `StatusDot` (→ Carbon `Tag`) | `carbon/adapters` |
| `DataState` | `DataState` (→ Carbon `SkeletonText`/`Tile`) | `carbon/adapters` |
| `ConfirmModal` | `ConfirmModal` (→ Carbon `Modal`) | `carbon/adapters` |
| `PageBreadcrumb` | `PageBreadcrumb` (→ Carbon `Breadcrumb`) | `carbon/adapters` |
| `ToastHost`/`pushToast` | (not yet adapted; use Carbon directly) | `@carbon/react` |
| `GlassRail`, `ActionDock`, etc. | **Do not reimplement** — use Carbon patterns | N/A |

### 3. Replace MUI components → Carbon

**Common swaps:**

#### Layout & Structure
```tsx
// OLD: MUI
import { Box, Stack, Grid } from '@mui/material';
<Box sx={{ display: 'flex', gap: 2 }}>...</Box>
<Stack direction="row" spacing={2}>...</Stack>
<Grid container spacing={2}>...</Grid>

// NEW: Carbon
import { Stack } from '@carbon/react';
<Stack gap="md" orientation="horizontal">...</Stack>
<Stack gap="md" orientation="horizontal">...</Stack>
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>
  {/* Use CSS grid or Carbon Grid if available */}
</div>
```

#### Typography
```tsx
// OLD: MUI
import { Typography } from '@mui/material';
<Typography variant="h1">Heading</Typography>
<Typography variant="body1">Body text</Typography>

// NEW: Carbon + semantic HTML
<h1 className="cds--type-heading-01">Heading</h1>
<p className="cds--type-body-01">Body text</p>

// Or use semantic tags alone (Carbon type resets apply)
<h1>Heading</h1>
<p>Body text</p>
```

**Available Carbon type classes:**
```
.cds--type-heading-01, heading-02, heading-03, ...
.cds--type-body-01, body-02, ...
.cds--type-label-01, ...
.cds--type-code-01, ...
```

#### Inputs & Forms
```tsx
// OLD: MUI
import { TextField, Select, Checkbox, Switch } from '@mui/material';
<TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
<Select value={val} onChange={(e) => setVal(e.target.value)}>
  <MenuItem value="a">Option A</MenuItem>
</Select>
<Checkbox checked={checked} onChange={(e) => setChecked(e.target.checked)} />
<Switch checked={on} onChange={(e) => setOn(e.target.checked)} />

// NEW: Carbon
import { TextInput, Dropdown, Checkbox, Toggle } from '@carbon/react';
<TextInput id="name" labelText="Name" value={name} onChange={(e) => setName(e.target.value)} />
<Dropdown id="sel" titleText="Option" selectedItem={val} onChange={({ selectedItem }) => setVal(selectedItem)}>
  {/* Dropdown items as JSX or array */}
</Dropdown>
<Checkbox id="cb" labelText="Agree" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
<Toggle id="toggle" labelText="Enable" toggled={on} onChange={(e) => setOn(e.target.checked)} />
```

#### Buttons & Actions
```tsx
// OLD: MUI
import { Button, IconButton } from '@mui/material';
<Button variant="contained" onClick={handleSave}>Save</Button>
<Button variant="text" href="/page">Link</Button>
<IconButton><ChevronRight /></IconButton>

// NEW: Carbon
import { Button, IconButton } from '@carbon/react';
<Button onClick={handleSave}>Save</Button>
<Button kind="ghost" href="/page">Link</Button>
<IconButton label="Expand"><ChevronRight size={20} /></IconButton>
```

**Button kinds:** `primary` (default), `secondary`, `danger`, `ghost`, `tertiary`

#### Modals & Dialogs
```tsx
// OLD: MUI
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
<Dialog open={open} onClose={handleClose}>
  <DialogTitle>Confirm</DialogTitle>
  <DialogContent>Delete this item?</DialogContent>
  <DialogActions>
    <Button onClick={handleClose}>Cancel</Button>
    <Button onClick={handleDelete}>Delete</Button>
  </DialogActions>
</Dialog>

// NEW: Carbon (via adapter)
import { ConfirmModal } from '../carbon/adapters';
<ConfirmModal
  open={open}
  onClose={handleClose}
  title="Confirm"
  kind="danger"
  reason="This will delete the item permanently."
  onConfirm={handleDelete}
/>

// Or use Carbon Modal directly
import { Modal } from '@carbon/react';
<Modal open={open} onClose={handleClose} modalHeading="Confirm">
  <p>Delete this item?</p>
  <ModalFooter>
    <Button onClick={handleClose}>Cancel</Button>
    <Button kind="danger" onClick={handleDelete}>Delete</Button>
  </ModalFooter>
</Modal>
```

#### Data Tables
```tsx
// OLD: MUI X DataGrid
import { DataGrid } from '@mui/x-data-grid';
<DataGrid rows={rows} columns={columns} />

// NEW: Carbon DataGrid adapter (drop-in replacement)
import { DataGrid } from '../carbon/adapters';
<DataGrid rows={rows} columns={columns} /> // Same API!
```

#### Icons
```tsx
// OLD: Material Icons
import { ChevronRight, Delete, Settings } from '@mui/icons-material';
<ChevronRight />

// NEW: Carbon Icons
import { ChevronRight, TrashCan, SettingsAdjust } from '@carbon/icons-react';
<ChevronRight size={20} /> {/* Explicit size */}
<TrashCan size={20} />
<SettingsAdjust size={20} />
```

**Icon name mapping:** See [`@carbon/icons-react` catalog](https://react.carbondesignsystem.com/?path=/story/icons--). Many names differ; use a mapping doc for Wave 4.

### 4. Wrap component in `<CarbonScope>`

If your component is nested inside a kit/MUI screen (not yet migrated), wrap your root:

```tsx
import { CarbonScope } from '../carbon/CarbonScope';

export function MyComponent() {
  return (
    <CarbonScope>
      {/* All Carbon components here theme correctly */}
      <div>...</div>
    </CarbonScope>
  );
}
```

**Skip this if:** The parent screen is already migrated to Carbon (already inside a `CarbonScope`).

### 5. Verify and test

```bash
# Type check
tsc frontend/src/components/MyComponent.tsx --noEmit

# Lint
eslint frontend/src/components/MyComponent.tsx --fix

# Grep to confirm NO MUI/kit imports remain
grep -E "@hcw/ui-kit|@mui/" frontend/src/components/MyComponent.tsx
# Should output nothing

# Start dev server and visually test
pnpm dev
```

### 6. Update visual baselines (if layout changed)

If the component's appearance changed (expected due to Carbon flat vs. HCW neumorphism):

```bash
# Run visual regression tests
cd e2e && pnpm test --project=visual

# Review snapshots in `visual-regression.spec.ts-snapshots/`
# Update baselines if the change is intentional
```

### 7. Submit PR

**Checklist before pushing:**
- [ ] Zero `@hcw/ui-kit` imports (except adapters in `carbon/adapters/`)
- [ ] Zero `@mui/material` imports
- [ ] Zero `@mui/icons-material` imports (leave Carbon icon imports)
- [ ] `tsc --noEmit` green
- [ ] `eslint` green
- [ ] Visual baselines reviewed
- [ ] Component renders correctly in the app
- [ ] Keyboard navigation works (Tab, Enter, Escape)

---

## Common Pitfalls & Solutions

### ❌ Problem: "Cannot find module '@carbon/react'"

**Solution:** Ensure Carbon packages are installed and `tsconfig.json` includes `node_modules`:
```bash
pnpm add @carbon/react @carbon/styles @carbon/icons-react
```

### ❌ Problem: "Component not styled; looks broken"

**Cause:** `CarbonScope` not wrapping the component, or `carbon-tree.scss` missing the component.

**Solution:**
1. Wrap in `<CarbonScope>` or ensure parent is already Carbon-scoped
2. Add the component to `frontend/src/carbon/carbon-tree.scss`:
   ```scss
   @use '@carbon/react/scss/components/button';
   @use '@carbon/react/scss/components/text-input';
   // ... etc for any new components
   ```

### ❌ Problem: "MUI prop `onChange` doesn't work on Carbon input"

**Cause:** Prop signature differs.

**Solution:** Check Carbon docs. Most Carbon inputs use `onChange` but with different signatures:
- **MUI:** `onChange({ target: { value } })`
- **Carbon `TextInput`:** `onChange(value)` or `onChange({ target: { value } })`

For safety, use destructuring:
```tsx
<TextInput onChange={(e) => setValue(e.target.value)} />
// or
<TextInput value={val} onChange={({ target: { value } }) => setValue(value)} />
```

### ❌ Problem: "Layout shifted; columns misaligned"

**Cause:** MUI `Grid` → CSS grid conversion; spacing tokens differ.

**Solution:** Use Carbon spacing tokens (`$spacing-2`, `$spacing-4`, etc.) instead of arbitrary values:
```tsx
<div style={{ display: 'grid', gap: 'var(--cds-spacing-04)' }}>
  {/* $spacing-04 = 16px; use var(--cds-spacing-*) for tokens */}
</div>
```

### ❌ Problem: "Button looks wrong; doesn't match Carbon spec"

**Cause:** Custom styling or wrong `kind` prop.

**Solution:** Use stock Carbon button `kind` and avoid inline `sx` overrides:
```tsx
// ✅ Correct
<Button kind="primary">Primary</Button>
<Button kind="secondary">Secondary</Button>
<Button kind="danger">Delete</Button>
<Button kind="ghost">Link-like</Button>

// ❌ Avoid
<Button sx={{ backgroundColor: '#custom', padding: '20px' }}>Wrong</Button>
```

---

## Carbon Design Tokens

### Spacing
```
--cds-spacing-01 = 4px
--cds-spacing-02 = 8px
--cds-spacing-03 = 12px
--cds-spacing-04 = 16px
--cds-spacing-05 = 20px
... (up to 12)
```

### Type scale
```
.cds--type-heading-01 (largest heading)
.cds--type-heading-02
.cds--type-heading-03
.cds--type-heading-04
.cds--type-heading-05
.cds--type-heading-06
.cds--type-body-01 (large body)
.cds--type-body-02 (default body)
.cds--type-label-01
.cds--type-label-02
.cds--type-code-01
.cds--type-code-02
```

### Colors (use `@carbon/colors` or Carbon `Tag`/`Tile` props)
```
$blue-60 (interactive default)
$gray-100 (dark backgrounds)
$white-0 (light backgrounds)
$red-60 (danger/error)
$green-60 (success)
$yellow-30 (warning)
... (see @carbon/colors for full palette)
```

---

## Debugging & Support

### Check Carbon component API

```
https://react.carbondesignsystem.com/?path=/story/components--*
```

### Check Carbon icons

```
https://carbondesignsystem.com/guidelines/icons/library/
```

### Ask in Slack or open an issue

Tag with `#carbon-migration`.

---

## Next Steps

1. Pick a file from your assigned tranche
2. Follow the recipe above
3. Submit PR with the checklist items completed
4. Product/Design reviews visual diffs
5. Merge once CI green + visual sign-off

---

**Need help?** See [`CARBON-MIGRATION-WAVE3-PLAN.md`](./CARBON-MIGRATION-WAVE3-PLAN.md) for tranches and priorities.
