/**
 * 2026-09-14 — enterprise-grade security pass. `account-profile.ts`'s
 * photo/certificate uploads previously trusted `file.type` alone — the
 * browser-supplied `Content-Type` on a `File` object, which is fully
 * attacker-controlled (a crafted `FormData`/`fetch` call bypassing the
 * `<input accept>` UI hint can claim any MIME type for any bytes). Same
 * class of gap `lib/drawings/filetype.ts` already closed for the
 * drawings-upload pipeline with real magic-byte sniffing — this is the
 * same idea, covering the four types account-profile uploads accept
 * (JPEG/PNG/WebP/PDF) rather than DWG/DXF/PDF.
 */

const SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  "image/jpeg": (buf) => buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  "image/png": (buf) => buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  // WebP: "RIFF" + 4-byte size + "WEBP"
  "image/webp": (buf) =>
    buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP",
  "application/pdf": (buf) => buf.length >= 5 && buf.subarray(0, 5).toString("latin1") === "%PDF-",
};

/**
 * True only if `claimedType` is a type we recognize AND the file's actual
 * bytes match that type's magic signature. A claimed type we don't have a
 * signature for is rejected outright (the caller's own allowlist should
 * never claim a type this function doesn't know).
 */
export async function matchesClaimedType(file: File, claimedType: string): Promise<boolean> {
  const check = SIGNATURES[claimedType];
  if (!check) return false;

  // Only the first few bytes matter for every signature above — reading
  // a small slice avoids buffering a full 10MB file into memory just to
  // check its header.
  const head = Buffer.from(await file.slice(0, 16).arrayBuffer());
  return check(head);
}
