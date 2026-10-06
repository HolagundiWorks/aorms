/** Types shared by the platform Server Actions (kept out of the "use server" modules: those may only export async functions). */

export type PlatformActionState = { error: string } | null;

export type AdminActionResult = { error?: string };
