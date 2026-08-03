import { Button, InlineNotification } from "@carbon/react";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { CarbonScope } from "../carbon/CarbonScope.js";

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

/** Top-level boundary so a render error shows a recovery screen, not a blank page. Wave 3 (Carbon). */
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
        <CarbonScope>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            <InlineNotification
              kind="error"
              lowContrast
              hideCloseButton
              title="Something went wrong"
              subtitle={this.state.error.message || "An unexpected error occurred."}
            />
            <div>
              <Button onClick={() => window.location.assign("/")}>Reload app</Button>
            </div>
          </div>
        </CarbonScope>
      );
    }
    return this.props.children;
  }
}
