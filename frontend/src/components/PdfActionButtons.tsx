import ShareIcon from "@mui/icons-material/Share";
import { Button } from "@mui/material";
import { pdfUiState } from "../lib/pdfUi.js";
import { shareViaWhatsApp } from "../lib/whatsapp.js";

type PdfActionButtonsProps = {
  status: string;
  url: string | null;
  canManage?: boolean;
  showRegenerateWhenReady?: boolean;
  generatePending?: boolean;
  onGenerate: () => void;
  /** When set, shows a "WhatsApp" action once the PDF is ready. */
  share?: { text?: string; phone?: string; fileName?: string };
  labels?: {
    open?: string;
    generate?: string;
    retry?: string;
    generating?: string;
  };
};

/** Shared PDF generate / poll / open UI for document action cells. */
export function PdfActionButtons({
  status,
  url,
  canManage = true,
  showRegenerateWhenReady = false,
  generatePending = false,
  onGenerate,
  share,
  labels = {},
}: PdfActionButtonsProps) {
  const ui = pdfUiState(status, url);
  const openLabel = labels.open ?? "Open PDF";
  const generateLabel = labels.generate ?? "Generate PDF";
  const retryLabel = labels.retry ?? "Retry PDF";
  const generatingLabel = labels.generating ?? "Generating…";

  if (ui === "open" && url) {
    return (
      <span style={{ display: "inline-flex", gap: "0.25rem" }}>
        <Button size="small" variant="text" href={url} target="_blank" rel="noreferrer">
          {openLabel}
        </Button>
        {share && (
          <Button
            size="small"
            variant="text"
            startIcon={<ShareIcon fontSize="small" />}
            onClick={() =>
              void shareViaWhatsApp({
                fileUrl: url,
                fileName: share.fileName,
                text: share.text ?? "Please find the attached document.",
                phone: share.phone,
              })
            }
          >
            WhatsApp
          </Button>
        )}
        {showRegenerateWhenReady && canManage && (
          <Button size="small" variant="text" disabled={generatePending} onClick={onGenerate}>
            Regenerate
          </Button>
        )}
      </span>
    );
  }
  if (ui === "generating") {
    return <span className="esti-label">{generatingLabel}</span>;
  }
  if (!canManage) {
    return <span>—</span>;
  }
  return (
    <Button size="small" variant="text" disabled={generatePending} onClick={onGenerate}>
      {ui === "retry" ? retryLabel : generateLabel}
    </Button>
  );
}
