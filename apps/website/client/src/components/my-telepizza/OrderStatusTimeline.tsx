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
        const reached = activeIndex >= 0 && index <= activeIndex;
        const current = activeIndex >= 0 && index === activeIndex;
        return (
          <div
            key={step}
            role="listitem"
            aria-current={current ? "step" : undefined}
            className={`rounded-xl px-2 ${compact ? "py-1 text-xs" : "py-1.5 text-xs"} text-center font-semibold capitalize motion-safe:transition-colors ${
              reached
                ? "bg-brand-red text-white shadow-sm"
                : "bg-brand-cream text-muted-foreground ring-1 ring-inset ring-border/60"
            }`}
          >
            {ORDER_STATUS_LABELS[step] ?? step}
          </div>
        );
      })}
    </div>
  );
}
