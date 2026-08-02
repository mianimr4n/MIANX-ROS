import { cn } from "@/lib/utils";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reloadAttempted: boolean;
}

function isChunkLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = `${error.name} ${error.message}`;
  return /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    msg,
  );
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, reloadAttempted: false };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  private handleReload = () => {
    // One soft reload for stale hashed chunks after deploy; never loop.
    if (isChunkLoadError(this.state.error) && !this.state.reloadAttempted) {
      try {
        sessionStorage.setItem("tpz-chunk-reload", "1");
      } catch {
        /* ignore */
      }
      this.setState({ reloadAttempted: true });
      window.location.reload();
      return;
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const chunkFail = isChunkLoadError(this.state.error);
      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem("tpz-chunk-reload") === "1";
      } catch {
        /* ignore */
      }

      if (chunkFail && alreadyReloaded) {
        try {
          sessionStorage.removeItem("tpz-chunk-reload");
        } catch {
          /* ignore */
        }
      }

      const title = chunkFail
        ? "This page failed to load updated assets."
        : "An unexpected error occurred.";
      const detail = chunkFail
        ? "A newer version of the site may be available. Reload once to fetch fresh files. If this continues, clear the tab cache or try again later."
        : this.state.error?.message || "Unknown error";

      return (
        <div className="flex items-center justify-center min-h-screen p-8 bg-background">
          <div className="flex flex-col items-center w-full max-w-2xl p-8">
            <AlertTriangle
              size={48}
              className="text-destructive mb-6 flex-shrink-0"
            />

            <h2 className="text-xl mb-4">{title}</h2>

            <div className="p-4 w-full rounded bg-muted overflow-auto mb-6">
              <p className="text-sm text-muted-foreground whitespace-break-spaces">{detail}</p>
            </div>

            <button
              type="button"
              onClick={this.handleReload}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg",
                "bg-primary text-primary-foreground",
                "hover:opacity-90 cursor-pointer",
              )}
            >
              <RotateCcw size={16} />
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
