import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { typeScaleSx } from "./chrome-sx.js";
import { VOICE, colors } from "./tokens.js";
export function ConfirmModal({ open, heading, body, reason, kind = "slip", confirmText = "Delete", cancelText = VOICE.cancelLabel, danger = true, pending = false, onConfirm, onClose, }) {
    const title = heading ??
        (kind === "mistake" ? VOICE.confirmHeadingMistake : VOICE.confirmHeadingSlip);
    return (_jsxs(Dialog, { open: open, onClose: onClose, fullWidth: true, maxWidth: "xs", "aria-labelledby": "confirm-modal-title", children: [_jsx(DialogTitle, { id: "confirm-modal-title", children: title }), _jsxs(DialogContent, { children: [typeof body === "string" ? _jsx("p", { children: body }) : body, (kind === "mistake" || reason) && reason ? (_jsx(Typography, { component: "div", sx: {
                            mt: 2,
                            p: 1.5,
                            backgroundColor: colors.layer02,
                            borderInlineStart: `3px solid ${danger ? colors.supportError : colors.accent}`,
                            ...typeScaleSx("body2"),
                            color: colors.textSecondary,
                        }, children: reason })) : null] }), _jsxs(DialogActions, { children: [_jsx(Button, { onClick: onClose, variant: "text", color: "inherit", children: cancelText }), _jsx(Button, { onClick: onConfirm, disabled: pending, variant: "contained", color: danger ? "error" : "primary", children: pending ? VOICE.pendingLabel : confirmText })] })] }));
}
export default ConfirmModal;
//# sourceMappingURL=ConfirmModal.js.map