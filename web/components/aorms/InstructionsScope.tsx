import { cookies } from "next/headers";
import { INSTRUCTIONS_COOKIE } from "../../lib/shell/preferences";

/**
 * Wraps a surface (portal layout, auth layout) in `data-instructions="on|off"`
 * so every `.aorms-instruction` note inside it can be hidden by CSS — the same
 * mechanism the Office Hub's side-panel toggle uses (AppShell sets the attribute
 * on its Content area). Read from the same cookie, so the preference follows the
 * person across the hub and every portal on this domain. Defaults on.
 */
export async function InstructionsScope({ children }: { children: React.ReactNode }) {
  const on = (await cookies()).get(INSTRUCTIONS_COOKIE)?.value !== "off";
  return <div data-instructions={on ? "on" : "off"}>{children}</div>;
}
