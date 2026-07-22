import { channelLabel, type PosChannelMode } from "@/lib/admin-pos";
import { cn } from "@/lib/utils";

const CHANNELS: PosChannelMode[] = ["dine-in", "takeaway", "phone", "walk-in", "delivery"];

export function OrderTypeSelector({
  value,
  onChange,
}: {
  value: PosChannelMode;
  onChange: (next: PosChannelMode) => void;
}) {
  return (
    <section aria-label="Order type" className="mb-4">
      <div className="flex flex-wrap gap-2">
        {CHANNELS.map((channel) => {
          const selected = value === channel;
          return (
            <button
              key={channel}
              type="button"
              onClick={() => onChange(channel)}
              className={cn(
                "min-h-12 rounded-xl px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--brand-red)]",
                selected
                  ? "bg-[var(--brand-red)] text-white"
                  : "border border-[var(--admin-border)] bg-white hover:bg-[var(--admin-soft)]",
              )}
              aria-pressed={selected}
            >
              {channelLabel(channel)}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        Live backend types: dine-in, pickup (takeaway/walk-in), delivery (delivery/phone). Channel is a POS UX label
        on `orderSource=pos`.
      </p>
    </section>
  );
}
