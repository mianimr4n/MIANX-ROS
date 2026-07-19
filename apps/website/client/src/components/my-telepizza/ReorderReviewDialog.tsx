import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ReorderPreview } from "@/lib/reorder";

type ReorderReviewDialogProps = {
  open: boolean;
  preview: ReorderPreview | null;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export function ReorderReviewDialog({
  open,
  preview,
  busy = false,
  onOpenChange,
  onConfirm,
}: ReorderReviewDialogProps) {
  if (!preview) return null;

  const refreshedTotal = preview.lines.reduce((sum, line) => {
    if (!line.available || line.refreshedUnitPrice == null) return sum;
    return sum + line.refreshedUnitPrice * line.source.quantity;
  }, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border-border">
        <DialogHeader>
          <DialogTitle className="brand-heading text-xl">Review reorder</DialogTitle>
          <DialogDescription>
            Prices and availability are refreshed from the live menu. Unavailable items are not
            added. Nothing is substituted silently.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            From order{" "}
            <span className="font-semibold text-brand-charcoal">{preview.order.orderNumber}</span>
          </p>
          <ul className="space-y-3">
            {preview.lines.map((line, index) => (
              <li
                key={`${line.source.productName}-${index}`}
                className={`rounded-2xl border p-3 ${
                  line.available ? "border-border bg-white" : "border-dashed border-amber-200 bg-amber-50/60"
                }`}
              >
                <div className="flex justify-between gap-3 font-semibold">
                  <span>
                    {line.source.quantity}× {line.cartItem?.name ?? line.source.productName}
                    {line.cartItem?.variant ? ` (${line.cartItem.variant})` : line.source.variantName ? ` (${line.source.variantName})` : ""}
                  </span>
                  <span className="shrink-0">
                    {line.available && line.refreshedUnitPrice != null
                      ? `Rs ${(line.refreshedUnitPrice * line.source.quantity).toLocaleString()}`
                      : "—"}
                  </span>
                </div>
                {!line.available ? (
                  <p className="text-xs text-amber-900 mt-1 font-medium" role="status">
                    {line.message ?? "Unavailable — will not be added."}
                  </p>
                ) : line.message ? (
                  <p className="text-xs text-amber-900 mt-1" role="status">
                    {line.message}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Ready at current menu price.</p>
                )}
              </li>
            ))}
          </ul>

          {preview.unavailableCount > 0 ? (
            <p className="text-xs text-amber-900 font-semibold" role="status">
              {preview.unavailableCount} item
              {preview.unavailableCount === 1 ? "" : "s"} unavailable and will be skipped.
            </p>
          ) : null}

          {preview.canAddAny ? (
            <p className="font-bold text-brand-charcoal">
              Refreshed subtotal (items only): Rs {refreshedTotal.toLocaleString()}
            </p>
          ) : (
            <p className="text-sm text-brand-red font-semibold" role="alert">
              None of these items are available to reorder right now.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-2xl brand-gradient text-white font-semibold"
            disabled={!preview.canAddAny || busy}
            onClick={onConfirm}
          >
            Add available items to cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
