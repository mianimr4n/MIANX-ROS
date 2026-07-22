import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STEPS,
  bucketForOrderStatus,
  statusStepIndex,
} from "@/lib/order-status";

type OrderStatusTimelineProps = {
  status: string;
  compact?: boolean;
  className?: string;
};

export function OrderStatusTimeline({
  status,
  compact = false,
  className = "",
}: OrderStatusTimelineProps) {
  const bucket = bucketForOrderStatus(status);
  const activeIndex = statusStepIndex(status);
  const label = ORDER_STATUS_LABELS[status.trim().toLowerCase()] ?? status;

  if (bucket === "cancelled") {
    return (
      <div
        className={`rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground ${className}`}
        role="status"
        aria-label={`Order status: ${label}`}
      >
        This order was cancelled.
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-3 sm:grid-cols-6 gap-1.5 ${className}`}
      role="list"
      aria-label={`Order progress: ${label}`}
    >
      {ORDER_STATUS_STEPS.map((step, index) => {
        const completed = activeIndex >= 0 && index < activeIndex;
        const current = activeIndex >= 0 && index === activeIndex;
        const future = activeIndex < 0 || index > activeIndex;

        let stepClass =
          "bg-brand-cream text-muted-foreground ring-1 ring-inset ring-border/60 opacity-70";
        if (completed) {
          stepClass =
            "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm";
        } else if (current) {
          stepClass =
            "relative bg-brand-red text-white shadow-md ring-2 ring-brand-red/30 scale-[1.02]";
        } else if (future) {
          stepClass =
            "bg-brand-cream/60 text-muted-foreground/80 ring-1 ring-inset ring-border/40";
        }

        return (
          <div
            key={step}
            role="listitem"
            aria-current={current ? "step" : undefined}
            className={`rounded-xl px-2 ${compact ? "min-h-9 py-1 text-xs" : "min-h-10 py-1.5 text-xs"} text-center font-semibold capitalize motion-safe:transition-all motion-reduce:transition-none ${stepClass}`}
          >
            {current ? (
              <span
                className="pointer-events-none absolute inset-0 rounded-xl border border-brand-gold/50 xp-pulse-ring"
                aria-hidden
              />
            ) : null}
            <span className="relative">{ORDER_STATUS_LABELS[step] ?? step}</span>
          </div>
        );
      })}
    </div>
  );
}
