import Send from "@mui/icons-material/Send";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLocation } from "react-router-dom";
import { CapabilityBadge } from "./CapabilityBadge.js";
import { useAuth } from "../lib/auth.js";
import { setEstiActivity } from "../lib/esti-activity.js";
import { closeRightSlot } from "../lib/right-slot.js";
import { useRuntimeCapabilities } from "../lib/runtimeCapabilities.js";
import { trpc } from "../lib/trpc.js";

type ChatTurn = { role: "user" | "assistant"; text: string };

/**
 * Ask ESTI command body — lives in the LF6 right slot Ask tab.
 * Answer-first; session history hidden until requested
 * (docs/esti/HCW-AI-ORCHESTRATION-UX.md). Not a second AI chrome.
 */
export function AskEstiPanel() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const caps = useRuntimeCapabilities();
  const canUseAgent =
    !!user &&
    user.role !== "CLIENT" &&
    !(user.role === "CONSULTANT" && user.consultantId);

  const settingsQ = trpc.ai.settings.useQuery(undefined, { enabled: canUseAgent });
  const aiEnabled = settingsQ.data?.agentEnabled ?? settingsQ.data?.enabled ?? false;
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];

  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const latestAnswer = useMemo(
    () => [...turns].reverse().find((t) => t.role === "assistant")?.text ?? null,
    [turns],
  );

  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const generate = trpc.ai.generate.useMutation({
    meta: { errorTitle: "Couldn't generate the AI response" },
    onSuccess: (res) => {
      setTurns((t) => [...t, { role: "assistant", text: res.output }]);
      setEstiActivity({ status: "done" });
    },
    onError: (err) => {
      setTurns((t) => [
        ...t,
        { role: "assistant", text: `Could not answer: ${err.message}` },
      ]);
      setEstiActivity({ status: "idle" });
    },
  });

  useEffect(() => {
    const t = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, generate.isPending]);

  if (!canUseAgent) {
    return (
      <Typography variant="body2" color="text.secondary">
        Ask ESTI is available to studio staff in the workspace.
      </Typography>
    );
  }

  function submit(e?: FormEvent) {
    e?.preventDefault();
    const prompt = input.trim();
    if (!prompt || generate.isPending) return;
    if (!aiEnabled) {
      setTurns((t) => [
        ...t,
        { role: "assistant", text: "ESTI is unavailable — AI is not enabled for this firm." },
      ]);
      setInput("");
      return;
    }
    setTurns((t) => [...t, { role: "user", text: prompt }]);
    setInput("");
    setEstiActivity({
      status: "orchestrating",
      mission: prompt.length > 90 ? `${prompt.slice(0, 90)}…` : prompt,
      operation: "Generating a response",
      context: projectId ? "this project" : "the workspace",
    });
    generate.mutate({ kind: "SUMMARY", mode: "agent", projectId, prompt });
  }

  function handleInputKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      closeRightSlot();
    }
  }

  return (
    <Stack spacing={2} className="esti-ai-bar">
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <span
          aria-hidden
          className="esti-brand esti-brand--esti esti-ai-bar__mark"
        />
        <TextField
          inputRef={inputRef}
          id="esti-agent-command"
          className="esti-grow"
          size="small"
          variant="standard"
          placeholder={
            projectId
              ? "Ask ESTI about this project…"
              : "Ask ESTI — projects, invoices, tasks, deadlines…"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKey}
          disabled={generate.isPending || settingsQ.isLoading}
        />
        <CapabilityBadge />
        <IconButton
          className="esti-neu-btn"
          color="primary"
          aria-label="Send"
          onClick={() => submit()}
          disabled={!input.trim() || generate.isPending}
        >
          <Send fontSize="small" />
        </IconButton>
      </Stack>

      {caps.aiDegraded && (
        <Alert severity="info" sx={{ py: 0.5 }}>
          <AlertTitle>Hosted AI</AlertTitle>
          Running on the hub — local Ollama is not on this
          machine. Same Ask ESTI panel as desktop.
        </Alert>
      )}

      {generate.isPending && (
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            ESTI is orchestrating your request…
          </Typography>
        </Stack>
      )}

      {!generate.isPending && latestAnswer && (
        <Paper className="esti-neu-inset" sx={{ p: 1.5 }}>
          <Typography variant="overline" color="text.secondary">
            ESTI
          </Typography>
          <Typography variant="body2" component="p">
            {latestAnswer}
          </Typography>
        </Paper>
      )}

      {turns.length > 0 && (
        <Box>
          <Button
            size="small"
            variant="text"
            onClick={() => setShowHistory((s) => !s)}
            aria-expanded={showHistory}
            sx={{ textTransform: "none", px: 0 }}
          >
            {showHistory ? "Hide" : "Show"} session history ({turns.length})
          </Button>
          {showHistory && (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {turns.map((t, i) => (
                <Paper key={`${t.role}-${i}`} className="esti-neu-inset" sx={{ p: 1.25 }}>
                  <Typography variant="overline" color="text.secondary">
                    {t.role === "user" ? "You" : "ESTI"}
                  </Typography>
                  <Typography variant="body2" component="p">
                    {t.text}
                  </Typography>
                </Paper>
              ))}
              <div ref={endRef} />
            </Stack>
          )}
        </Box>
      )}

      {turns.length === 0 && !generate.isPending && (
        <Typography variant="body2" color="text.secondary">
          Ask ESTI anything — revisions, invoices, client status, upcoming
          deadlines, fees, or team workload. Only the answer returns here; your
          session history stays tucked away below.
        </Typography>
      )}
    </Stack>
  );
}
