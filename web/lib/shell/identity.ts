/**
 * Header identity helpers (2026-09-14, shell/identity/KPI spec §6-7) —
 * plain, side-effect-free functions so both the Server Component that
 * fetches the data (app/(app)/layout.tsx) and anything that wants to
 * unit-test the logic can use them without a component render.
 */

/**
 * Current hour in IST, not the server process's own timezone — this
 * renders server-side (Server Component), and a Hostinger/Node default
 * timezone is very unlikely to already be Asia/Kolkata, so a bare
 * `new Date().getHours()` would silently greet everyone by UTC time
 * instead. `Intl.DateTimeFormat` with an explicit `timeZone` sidesteps
 * relying on the server's own TZ configuration entirely.
 */
export function getIstHour(): number {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date()));
  // Some ICU builds format midnight as "24" rather than "0" for hour12:
  // false — normalize so downstream range checks (`hour >= 5 && hour <
  // 12`, etc.) don't need to special-case it themselves.
  return hour === 24 ? 0 : hour;
}

/** Greeting band for a given hour (0-23) — 05:00–11:59 morning, 12:00–16:59 afternoon, else evening (covers 17:00–04:59, the late-night case the spec's own range wraps past midnight). */
export function getGreeting(hour: number): string {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  return "Good evening";
}

// Professional honorifics this app's own profiles actually carry —
// "Ar." (Architect) is the standard Indian prefix architects use before
// their name (e.g. "Ar. Aditi Rao"), the same way "Dr."/"Er." work for
// doctors/engineers. Found live (2026-09-14): the greeting was reading
// "Good evening, Ar." — `full_name`'s literal first word is the title,
// not the name, so both `getFirstName` and `getInitials` need to skip
// past it rather than treating every leading word as part of the name.
const NAME_TITLES = new Set(["ar", "ar.", "er", "er.", "dr", "dr.", "mr", "mr.", "mrs", "mrs.", "ms", "ms."]);

function nameWordsWithoutTitle(name: string): string[] {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1 && NAME_TITLES.has(words[0]!.toLowerCase())) {
    return words.slice(1);
  }
  return words;
}

/** First letter of up to the first two real name words (a leading title like "Ar."/"Dr." is skipped — see NAME_TITLES), e.g. "Ar. Aditi Rao" → "AR", "Aditi Rao" → "AR". Falls back to "?" for an empty/whitespace/title-only name rather than throwing on an empty array. */
export function getInitials(name: string): string {
  const parts = nameWordsWithoutTitle(name).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]!.toUpperCase()).join("");
}

/** Just the first real name word, title skipped — e.g. "Ar. Aditi Rao" → "Aditi", "Vishwabhiram H." → "Vishwabhiram" — for the header greeting (2026-09-14, explicit request: "use first name only, keep it casual", then corrected same day once the title-prefix bug above was found). The dropdown menu still shows the full, untrimmed name (HeaderUserMenu.tsx). Falls back to "there" for an empty/whitespace/title-only name, same as the greeting's own existing fallback (app/(app)/layout.tsx). */
export function getFirstName(name: string): string {
  return nameWordsWithoutTitle(name)[0] || "there";
}
