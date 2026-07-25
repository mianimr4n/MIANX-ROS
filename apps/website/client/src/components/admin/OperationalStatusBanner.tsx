import { cn } from "@/lib/utils";
import { formatLastSuccess, type OperationalState } from "@/lib/op-status";

export type OperationalStatusBannerProps = {
  /** Canonical D2 state. The banner renders only for ERROR, OFFLINE, and STALE. */
  state: OperationalState;
  /** Business-language failure message. */
  error?: string | null;
  /** ISO timestamp of the last successful refresh (required to justify STALE data). */
  lastSuccessAt?: string | null;
  onRetry?: () => void;
  /** Technical diagnostics (correlation id) — only shown when the caller's role allows it. */
  correlationId?: string | null;
  showTechnicalDetail?: boolean;
  className?: string;
};

const BANNER_STYLES: Partial<Record<OperationalState, string>> = {
  ERROR: "border-red-200 bg-red-50 text-red-900",
  OFFLINE: "border-amber-300 bg-amber-50 text-amber-950",
  STALE: "border-amber-200 bg-amber-50 text-amber-950",
};

const BANNER_TITLE: Partial<Record<OperationalState, string>> = {
  ERROR: "Data failed to load",
  OFFLINE: "Cannot reach the server",
  STALE: "Showing last successful data",
};

/**
 * Shared D2 status banner. Guarantees that ERROR, OFFLINE, and STALE are
 * visibly distinct from LIVE data, always carries a retry action, and shows
 * the last successful refresh time whenever stale data stays on screen.
 */
export function OperationalStatusBanner({
  state,
  error,
  lastSuccessAt,
  onRetry,
  correlationId,
  showTechnicalDetail = false,
  className,
}: OperationalStatusBannerProps) {
  if (state !== "ERROR" && state !== "OFFLINE" && state !== "STALE") return null;

  const lastSuccessLabel = formatLastSuccess(lastSuccessAt ?? null);

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm",
        BANNER_STYLES[state],
        className,
      )}
    >
      <div className="min-w-0">
        <p className="font-semibold">{BANNER_TITLE[state]}</p>
        {error ? <p className="mt-0.5 text-xs opacity-90">{error}</p> : null}
        {state === "STALE" && lastSuccessLabel ? (
          <p className="mt-0.5 text-xs opacity-90">Last successful refresh: {lastSuccessLabel}</p>
        ) : null}
        {showTechnicalDetail && correlationId ? (
          <p className="mt-0.5 font-mono text-[10px] opacity-70">request {correlationId}</p>
        ) : null}
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 rounded-lg border border-current/30 bg-white/60 px-3 py-1.5 text-xs font-semibold hover:bg-white"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}
