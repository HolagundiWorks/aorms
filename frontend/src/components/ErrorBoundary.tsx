import { Alert, AlertTitle, Button, Stack } from "@mui/material";
import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Top-level boundary so a render error shows a recovery screen, not a blank page. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Render error:", error, info);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <Stack spacing={2} sx={{ p: 2 }}>
          <Alert severity="error">
            <AlertTitle>Something went wrong</AlertTitle>
            {this.state.error.message || "An unexpected error occurred."}
          </Alert>
          <div>
            <Button variant="contained" onClick={() => window.location.assign("/")}>
              Reload app
            </Button>
          </div>
        </Stack>
      );
    }
    return this.props.children;
  }
}
