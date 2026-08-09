import { Box, Button, Stack, Tab, Tabs, Typography } from "@mui/material";
import { RADIUS } from "@hcw/ui-kit";
import { COMPOSITION_RHYTHM } from "../../lib/composition.js";

export type SectionNavGroup = {
  slug: string;
  label: string;
  tabs: { slug: string; label: string }[];
};

/**
 * Horizontal project section nav — group chips + peer tabs.
 * Replaces the retired vertical ProjectRailNav in the stage header.
 */
export function ProjectSectionNav({
  groups,
  activeSlug,
  onSelect,
  ariaLabel = "Sections",
}: {
  groups: SectionNavGroup[];
  activeSlug: string;
  onSelect: (slug: string) => void;
  ariaLabel?: string;
}) {
  const activeGroup =
    groups.find((g) => g.tabs.some((t) => t.slug === activeSlug)) ?? groups[0];
  if (!activeGroup) return null;

  const selectGroup = (groupSlug: string) => {
    const group = groups.find((g) => g.slug === groupSlug);
    if (!group?.tabs[0]) return;
    const keep = group.tabs.find((t) => t.slug === activeSlug);
    onSelect(keep?.slug ?? group.tabs[0].slug);
  };

  return (
    <Stack
      component="nav"
      aria-label={ariaLabel}
      spacing={COMPOSITION_RHYTHM.xs}
      sx={{ width: 1, minWidth: 0 }}
    >
      <Stack
        direction="row"
        spacing={0.75}
        useFlexGap
        sx={{ flexWrap: "wrap", alignItems: "center" }}
      >
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ mr: 0.5, lineHeight: 1.2 }}
        >
          Section
        </Typography>
        {groups.map((group) => {
          const selected = group.slug === activeGroup.slug;
          return (
            <Button
              key={group.slug}
              size="small"
              variant={selected ? "contained" : "text"}
              color={selected ? "primary" : "inherit"}
              onClick={() => selectGroup(group.slug)}
              sx={{
                textTransform: "none",
                borderRadius: `${RADIUS}px`,
                minHeight: 32,
                px: 1.5,
                fontWeight: selected ? 600 : 500,
              }}
            >
              {group.label}
            </Button>
          );
        })}
      </Stack>

      <Box sx={{ borderBottom: 1, borderColor: "divider", minWidth: 0 }}>
        <Tabs
          value={activeSlug}
          onChange={(_, next: string) => onSelect(next)}
          aria-label={`${activeGroup.label} tabs`}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              textTransform: "none",
              minHeight: 40,
              fontWeight: 500,
            },
          }}
        >
          {activeGroup.tabs.map((tab) => (
            <Tab key={tab.slug} value={tab.slug} label={tab.label} />
          ))}
        </Tabs>
      </Box>
    </Stack>
  );
}

/** @deprecated Prefer ProjectSectionNav — alias kept for import churn. */
export { ProjectSectionNav as ProjectRailNav };
