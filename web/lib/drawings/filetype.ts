/**
 * Content sniffing for the drawings upload — ported verbatim from
 * backend/src/lib/filetype.ts (the pure-function subset this upload path
 * actually needs; the image/tabular checks that file also has are for
 * other upload routes, not drawings, so not carried over here). Extension
 * checks are trivially spoofable, so magic bytes/structure are inspected
 * before a file is trusted (audit S3) — defensive heuristics, not a full
 * parser.
 */

const DXF_HEAD_BYTES = 8192;

/** PDF — `%PDF` magic at file start (plan sheets for measurement). */
export function looksLikePdf(buf: Buffer): boolean {
  if (buf.length < 5) return false;
  return buf.subarray(0, 5).toString("latin1") === "%PDF-";
}

/** AutoCAD DWG — common magic at file start (users often pick .dwg by mistake). */
export function looksLikeDwg(buf: Buffer): boolean {
  if (buf.length < 6) return false;
  const sig = buf.subarray(0, 6).toString("ascii");
  return sig.startsWith("AC10") || sig.startsWith("AC1.");
}

/** AutoCAD DXF — ASCII (group-code text) or the binary DXF sentinel. */
export function looksLikeDxf(buf: Buffer): boolean {
  if (buf.length < 8) return false;
  // Binary DXF: "AutoCAD Binary DXF\r\n\x1a\x00"
  const binarySentinel = "AutoCAD Binary DXF";
  const head = buf.subarray(0, Math.min(buf.length, DXF_HEAD_BYTES)).toString("latin1");
  if (head.startsWith(binarySentinel)) return true;
  // ASCII DXF: group code 0 + SECTION (case-insensitive). Tolerate BOM, leading
  // comments (999 groups), and preamble before the first SECTION block.
  let text = head;
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  if (!/\bsection\b/i.test(text)) return false;
  return /(?:^|\r?\n)\s*0\s*(?:\r?\n|$)/m.test(text);
}

/** 25 MB DXF/PDF cap — matches the old backend's DRAWING_MAX_BYTES exactly
 * (packages/contracts/src/drawing.ts), which web/ doesn't depend on. */
export const DRAWING_MAX_BYTES = 25 * 1024 * 1024;
