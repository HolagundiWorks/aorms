/**
 * Placeholder images for projects without a cover (2026-10-06). Twelve architectural illustrations in
 * `public/placeholders/`; a project always gets the same one (from its ref's running number, else a hash), so a card does not change
 * between visits. Used by the Projects gallery, its line view and the project page — in place of the old
 * generated plot/plan drawing. Real covers (project-covers bucket) always win over a placeholder.
 */
export const PLACEHOLDER_COUNT = 12;

export function placeholderFor(seed: string): string {
  // Refs usually end in a running number ("…-PRJ-07"): use it directly so neighbouring projects get
  // different images; otherwise fall back to a hash of the whole ref.
  const tail = /(\d+)\D*$/.exec(seed);
  const n = tail ? Number(tail[1]) : [...seed].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  return `/placeholders/project-${(n % PLACEHOLDER_COUNT) + 1}.svg`;
}
