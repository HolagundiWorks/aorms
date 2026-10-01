import { cookies } from "next/headers";
import { INSTRUCTIONS_COOKIE } from "../../lib/shell/preferences";
import { InstructionsToggleButton } from "./InstructionsToggleButton";

/** Header action for portals: shows/hides "how to use" notes. Server wrapper only to read the saved preference for first paint. */
export async function InstructionsToggle() {
  const on = (await cookies()).get(INSTRUCTIONS_COOKIE)?.value !== "off";
  return <InstructionsToggleButton initial={on} />;
}
