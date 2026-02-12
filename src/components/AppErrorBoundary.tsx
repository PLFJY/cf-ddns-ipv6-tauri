import { Button, Card, FluentProvider, Text, Title3, webLightTheme } from "@fluentui/react-components";
import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  message: string;
}

// React docs ("Error Boundaries"): catch render lifecycle errors to avoid blank screens.
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      message: ""
    };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      message: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("desktop ui crashed", error, errorInfo.componentStack);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <FluentProvider theme={webLightTheme}>
        <div style={{ minHeight: "100vh", padding: "24px" }}>
          <Card style={{ maxWidth: "760px", margin: "0 auto", display: "grid", gap: "10px" }}>
            <Title3>UI crashed</Title3>
            <Text>{this.state.message || "Unknown error"}</Text>
            <Text>Please restart the app. If this repeats, capture console logs and report it.</Text>
            <Button
              appearance="primary"
              onClick={() => window.location.reload()}
            >
              Reload UI
            </Button>
          </Card>
        </div>
      </FluentProvider>
    );
  }
}
