import {
  Alert,
  AlertTitle,
  Box,
  Button,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { DEFAULT_AI_SETTINGS, type AiSettings } from "@esti/contracts";
import { useEffect, useState } from "react";
import { EstiAiExplainLabel } from "../AiCarbon.js";
import { trpc } from "../../lib/trpc.js";

export function AiStudioSettingsPanel({ isEnterprise: _isEnterprise = false }: { isEnterprise?: boolean }) {
  const utils = trpc.useUtils();
  const settingsQ = trpc.ai.settings.useQuery();
  const [form, setForm] = useState<AiSettings>(DEFAULT_AI_SETTINGS);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settingsQ.data) {
      const d = settingsQ.data;
      setForm({
        enabled: d.enabled,
        provider: d.provider,
        model: d.model,
        ollamaBaseUrl: d.ollamaBaseUrl ?? undefined,
        redactPii: d.redactPii,
      });
    }
  }, [settingsQ.data]);

  const save = trpc.ai.setSettings.useMutation({
    meta: { errorTitle: "Couldn't save the AI Studio settings" },
    onSuccess: () => {
      utils.ai.settings.invalidate();
      setMsg("AI Studio settings saved");
      setErr(null);
    },
    onError: (e) => { setErr(e.message); setMsg(null); },
  });

  return (
    <Box className="esti-ai-settings-tile" sx={{ p: 3, maxWidth: 760 }}>
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="h5" component="h2">AI Studio</Typography>
          <EstiAiExplainLabel scope="draft" />
        </Stack>
        <Typography variant="body2">
          AORMS is <strong>desktop-first</strong> and AI runs <strong>locally</strong>.
          Drafts use a local <strong>Ollama</strong> model on this node; when Ollama is
          unavailable, ESTI falls back to a deterministic <strong>template</strong>. There is
          no hosted or bring-your-own cloud provider, and local AI is <strong>unmetered</strong>.
        </Typography>
        <Alert severity="info">
          <AlertTitle>Ollama endpoint</AlertTitle>
          {settingsQ.data?.ollamaDefaultUrl ?? "http://127.0.0.1:11434"}
        </Alert>
        {msg && <Alert severity="success" onClose={() => setMsg(null)}>{msg}</Alert>}
        {err && <Alert severity="error" onClose={() => setErr(null)}>{err}</Alert>}
        <FormControlLabel
          control={
            <Switch
              checked={form.enabled}
              onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
          }
          label="Enable AI Studio"
        />
        <TextField
          id="ai-provider"
          select
          label="Provider"
          value={form.provider}
          onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value as AiSettings["provider"] }))}
          fullWidth
        >
          <MenuItem value="ollama">Ollama (local model)</MenuItem>
          <MenuItem value="mock">Template only (offline / demo)</MenuItem>
        </TextField>

        <TextField
          id="ai-ollama-url"
          label="Ollama base URL"
          helperText="Docker service name, e.g. http://ollama:11434"
          value={form.ollamaBaseUrl ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, ollamaBaseUrl: e.target.value.trim() || undefined }))}
          fullWidth
        />
        <TextField
          id="ai-model"
          label="Ollama model name"
          helperText="Must match a model pulled on the server, e.g. llama3.2"
          value={form.model}
          onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
          fullWidth
        />

        <FormControlLabel
          control={
            <Switch
              checked={form.redactPii}
              onChange={(e) => setForm((f) => ({ ...f, redactPii: e.target.checked }))}
            />
          }
          label="Redact PII in stored output"
        />
        <Box>
          <Button
            variant="contained"
            disabled={save.isPending}
            onClick={() => save.mutate(form)}
          >
            {save.isPending ? "Saving…" : "Save AI settings"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
