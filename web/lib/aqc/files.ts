/**
 * Files attached to AQC versions (estimate/BOQ PDFs, BBS and rate workbooks). AQC asks for a signed upload URL, PUTs the
 * bytes, then passes the key when it adds the version. Keys are minted here, never by the client, and always live under
 * `<firmId>/<aqcProjectId>/<kind>/<sha256>.<ext>`; the database function re-checks that prefix.
 */
export const AQC_BUCKET = "aqc";
export const MAX_AQC_FILE_BYTES = 25 * 1024 * 1024;

const TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "image/png": "png",
  "image/jpeg": "jpg",
};

export type UploadCheck = { ok: true; ext: string } | { ok: false; message: string };

export function checkAqcUpload(input: { contentType: string; sizeBytes: number; sha256: string }): UploadCheck {
  const ext = TYPES[input.contentType];
  if (!ext) return { ok: false, message: "Upload a PDF, XLSX, CSV, PNG or JPEG." };
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) return { ok: false, message: "The file is empty." };
  if (input.sizeBytes > MAX_AQC_FILE_BYTES) return { ok: false, message: "Files can be up to 25 MB." };
  if (!/^[0-9a-f]{64}$/.test(input.sha256)) return { ok: false, message: "Send the file's SHA-256 as 64 hex characters." };
  return { ok: true, ext };
}

export function buildAqcStorageKey(firmId: string, aqcProjectId: string, kind: string, sha256: string, ext: string): string {
  return `${firmId}/${aqcProjectId}/${kind}/${sha256}.${ext}`;
}
