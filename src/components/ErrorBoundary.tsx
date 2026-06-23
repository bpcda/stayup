import { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary globale: cattura errori runtime nei componenti React e
 * mostra un fallback elegante invece di una pagina bianca.
 *
 * Predisposto per futura integrazione con Sentry/PostHog: vedi `reportError`.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.reportError(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      // Log solo in development per evitare leak in produzione.
      // eslint-disable-next-line no-console
      console.error("[ErrorBoundary]", error, errorInfo);
    }
    // TODO: integrare qui Sentry/PostHog quando disponibili.
    // es. Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleHome = () => {
    window.location.assign("/");
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const isDev = import.meta.env.DEV;
    const error = this.state.error;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 py-12">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" aria-hidden />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">
              Qualcosa è andato storto
            </h1>
            <p className="text-muted-foreground">
              Si è verificato un errore inatteso. Puoi riprovare o tornare alla
              home.
            </p>
          </div>

          {isDev && error && (
            <pre className="text-left text-xs bg-muted text-muted-foreground rounded-md p-3 overflow-auto max-h-48 border border-border">
              {error.name}: {error.message}
              {error.stack ? `\n\n${error.stack}` : ""}
            </pre>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={this.handleRetry} variant="default">
              Riprova
            </Button>
            <Button onClick={this.handleHome} variant="outline">
              Torna alla Home
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
