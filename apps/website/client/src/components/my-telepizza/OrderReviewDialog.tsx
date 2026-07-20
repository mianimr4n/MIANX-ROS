import { useEffect, useState } from "react";
import { Loader2, Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type OrderReviewDialogProps = {
  open: boolean;
  orderNumber: string;
  mode?: "create" | "edit";
  initialRating?: number;
  initialComment?: string;
  busy?: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { rating: number; comment: string }) => void;
};

export function OrderReviewDialog({
  open,
  orderNumber,
  mode = "create",
  initialRating = 0,
  initialComment = "",
  busy = false,
  onOpenChange,
  onSubmit,
}: OrderReviewDialogProps) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRating(initialRating);
    setComment(initialComment);
    setError(null);
  }, [open, initialRating, initialComment]);

  function handleSubmit() {
    if (rating < 1 || rating > 5) {
      setError("Choose a star rating from 1 to 5.");
      return;
    }
    setError(null);
    onSubmit({ rating, comment: comment.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border">
        <DialogHeader>
          <DialogTitle className="brand-heading text-xl">
            {mode === "edit" ? "Edit your review" : "Rate your order"}
          </DialogTitle>
          <DialogDescription>
            Order <span className="font-semibold text-brand-charcoal">{orderNumber}</span> — your
            rating helps Telepizza improve. Reviews can be edited within 24 hours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Rating</Label>
            <div
              className="flex gap-1"
              role="radiogroup"
              aria-label={`Star rating for order ${orderNumber}`}
            >
              {[1, 2, 3, 4, 5].map((value) => {
                const selected = rating >= value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} star${value === 1 ? "" : "s"}`}
                    className={`min-h-11 min-w-11 rounded-xl p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 ${
                      selected ? "text-brand-red" : "text-muted-foreground hover:text-brand-red/70"
                    }`}
                    onClick={() => setRating(value)}
                  >
                    <Star
                      className={`h-7 w-7 ${selected ? "fill-brand-red" : ""}`}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="order-review-comment">Comment (optional)</Label>
            <Textarea
              id="order-review-comment"
              value={comment}
              onChange={(event) => {
                setComment(event.target.value);
                setError(null);
              }}
              rows={4}
              maxLength={1000}
              placeholder="What did you enjoy? Anything we could do better?"
              className="rounded-2xl resize-none"
            />
          </div>

          {error ? (
            <p className="text-sm text-brand-red" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="rounded-2xl brand-gradient text-white font-semibold"
            disabled={busy}
            onClick={handleSubmit}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "edit" ? "Save review" : "Submit review"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
