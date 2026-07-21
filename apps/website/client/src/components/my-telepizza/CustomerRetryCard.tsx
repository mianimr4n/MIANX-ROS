import { Button } from "@/components/ui/button";

type CustomerRetryCardProps = {
  title?: string;
  description?: string;
  onRetry: () => void;
  busy?: boolean;
  className?: string;
};

/** Friendly load-failure card with a Retry action. */
export function CustomerRetryCard({
  title = "We're having trouble loading your information.",
  description = "Please try again in a moment.",
  onRetry,
  busy = false,
  className = "",
}: CustomerRetryCardProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-muted/20 px-4 py-4 text-sm space-y-2 ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-medium text-brand-charcoal">{title}</p>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="min-h-11 rounded-2xl"
        disabled={busy}
        onClick={onRetry}
      >
        {busy ? "Trying again…" : "Try again"}
      </Button>
    </div>
  );
}
