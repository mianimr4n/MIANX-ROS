import { cn } from "@/lib/utils";
import {
  capabilityBadgeClassName,
  toCapabilityBadgeLabel,
  type CapabilityTruthStatus,
} from "@/lib/capability-status";

type Props = {
  status: CapabilityTruthStatus;
  className?: string;
  /** Override visible text while keeping status semantics for tests/a11y. */
  label?: string;
};

/**
 * Accessible capability maturity badge — text is the sole status cue (not color alone).
 */
export function CapabilityStatusBadge({ status, className, label }: Props) {
  const text = label ?? toCapabilityBadgeLabel(status);
  return (
    <span
      role="status"
      aria-label={`Capability status: ${text}`}
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        capabilityBadgeClassName(status),
        className,
      )}
    >
      {text}
    </span>
  );
}
