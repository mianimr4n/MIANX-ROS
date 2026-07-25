/**
 * Public reservation booking — /book and /book/cancel.
 * Steps: branch → party → date → slots → guest → privacy → confirmation.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { CalendarDays, CheckCircle2, ChevronLeft, Loader2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useBranch } from "@/contexts/BranchContext";
import { isApiConfigured } from "@/lib/api";
import {
  cancelPublicReservation,
  createPublicReservation,
  mapPublicBookingError,
  searchPublicAvailability,
  type PublicAvailabilitySlot,
  type PublicReservationCreateResponse,
} from "@/lib/public-booking-api";

type Step = "branch" | "party" | "date" | "slots" | "guest" | "privacy" | "done";

function newIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `pb-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatSlotLabel(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString();
  }
}

function todayLocalIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function PublicBookingFlow() {
  const { allBranches } = useBranch();
  const operating = useMemo(
    () => allBranches.filter((b) => b.status === "operating"),
    [allBranches],
  );

  const [step, setStep] = useState<Step>("branch");
  const [branchCode, setBranchCode] = useState(operating[0]?.code ?? "");
  const [partySize, setPartySize] = useState(2);
  const [date, setDate] = useState(todayLocalIsoDate());
  const [slots, setSlots] = useState<PublicAvailabilitySlot[]>([]);
  const [timezone, setTimezone] = useState("Asia/Karachi");
  const [selectedStartAt, setSelectedStartAt] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [accessibilityRequired, setAccessibilityRequired] = useState(false);
  const [highChairCount, setHighChairCount] = useState(0);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<PublicReservationCreateResponse | null>(null);
  const [idempotencyKey] = useState(newIdempotencyKey);

  useEffect(() => {
    if (!branchCode && operating[0]?.code) {
      setBranchCode(operating[0].code);
    }
  }, [branchCode, operating]);

  async function loadSlots() {
    setLoading(true);
    setError(null);
    setSlots([]);
    setSelectedStartAt(null);
    try {
      const data = await searchPublicAvailability({ branchCode, date, partySize });
      setTimezone(data.timezone);
      setSlots(data.slots.filter((s) => s.available));
      setStep("slots");
      if (data.slots.filter((s) => s.available).length === 0) {
        setError("No available times for that date. Try another day or party size.");
      }
    } catch (err) {
      setError(mapPublicBookingError(err));
    } finally {
      setLoading(false);
    }
  }

  async function submitBooking() {
    if (!selectedStartAt || !privacyAccepted) return;
    setLoading(true);
    setError(null);
    try {
      const data = await createPublicReservation(
        {
          branchCode,
          guestName: guestName.trim(),
          guestPhone: guestPhone.trim(),
          guestEmail: guestEmail.trim() || null,
          partySize,
          startAt: selectedStartAt,
          accessibilityRequired,
          highChairCount,
          specialRequests: specialRequests.trim() || null,
          privacyAccepted: true,
        },
        idempotencyKey,
      );
      setConfirmation(data);
      setStep("done");
    } catch (err) {
      setError(mapPublicBookingError(err));
    } finally {
      setLoading(false);
    }
  }

  if (!isApiConfigured) {
    return (
      <div className="rounded-2xl border border-border bg-white p-6 text-center">
        <p className="text-muted-foreground">
          Online booking requires the API. Set <code className="text-sm">VITE_API_BASE_URL</code> to enable
          reservations.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {step === "branch" && (
        <section className="space-y-4">
          <h2 className="font-[var(--font-display)] text-xl font-bold text-brand-charcoal">Choose a branch</h2>
          <div className="grid gap-3">
            {operating.map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => {
                  if (!b.code) return;
                  setBranchCode(b.code);
                  setStep("party");
                }}
                className={`rounded-2xl border-2 px-4 py-4 text-left transition ${
                  branchCode === b.code
                    ? "border-brand-red bg-brand-red/5"
                    : "border-border hover:border-brand-red/40"
                }`}
              >
                <div className="font-semibold text-brand-charcoal">{b.name}</div>
                <div className="text-sm text-muted-foreground">{b.address}</div>
              </button>
            ))}
            {operating.length === 0 ? (
              <p className="text-muted-foreground">No operating branches available for booking.</p>
            ) : null}
          </div>
        </section>
      )}

      {step === "party" && (
        <section className="space-y-4">
          <button type="button" className="inline-flex items-center gap-1 text-sm text-muted-foreground" onClick={() => setStep("branch")}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="font-[var(--font-display)] text-xl font-bold text-brand-charcoal flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-red" /> Party size
          </h2>
          <div className="flex items-center gap-4">
            <Button type="button" variant="outline" onClick={() => setPartySize((n) => Math.max(1, n - 1))}>
              −
            </Button>
            <span className="text-3xl font-bold tabular-nums">{partySize}</span>
            <Button type="button" variant="outline" onClick={() => setPartySize((n) => Math.min(20, n + 1))}>
              +
            </Button>
          </div>
          <Button type="button" className="bg-brand-red hover:bg-brand-red/90" onClick={() => setStep("date")}>
            Continue
          </Button>
        </section>
      )}

      {step === "date" && (
        <section className="space-y-4">
          <button type="button" className="inline-flex items-center gap-1 text-sm text-muted-foreground" onClick={() => setStep("party")}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="font-[var(--font-display)] text-xl font-bold text-brand-charcoal flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-red" /> Date
          </h2>
          <input
            type="date"
            min={todayLocalIsoDate()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-xl border border-border px-4 py-3"
          />
          <Button type="button" className="bg-brand-red hover:bg-brand-red/90" disabled={loading} onClick={() => void loadSlots()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find available times"}
          </Button>
        </section>
      )}

      {step === "slots" && (
        <section className="space-y-4">
          <button type="button" className="inline-flex items-center gap-1 text-sm text-muted-foreground" onClick={() => setStep("date")}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="font-[var(--font-display)] text-xl font-bold text-brand-charcoal">Available times</h2>
          <p className="text-sm text-muted-foreground">Times shown in {timezone}</p>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-brand-red" />
            </div>
          ) : slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-muted-foreground">
              No open slots.{" "}
              <button type="button" className="underline" onClick={() => setStep("date")}>
                Pick another date
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slots.map((s) => (
                <button
                  key={s.startAt}
                  type="button"
                  onClick={() => {
                    setSelectedStartAt(s.startAt);
                    setStep("guest");
                  }}
                  className={`rounded-xl border px-3 py-3 text-sm font-medium transition ${
                    selectedStartAt === s.startAt
                      ? "border-brand-red bg-brand-red text-white"
                      : "border-border hover:border-brand-red/50"
                  }`}
                >
                  {formatSlotLabel(s.startAt, timezone)}
                </button>
              ))}
            </div>
          )}
          <Button type="button" variant="outline" disabled={loading} onClick={() => void loadSlots()}>
            Retry search
          </Button>
        </section>
      )}

      {step === "guest" && (
        <section className="space-y-4">
          <button type="button" className="inline-flex items-center gap-1 text-sm text-muted-foreground" onClick={() => setStep("slots")}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="font-[var(--font-display)] text-xl font-bold text-brand-charcoal">Guest details</h2>
          {selectedStartAt ? (
            <p className="text-sm text-muted-foreground">{formatSlotLabel(selectedStartAt, timezone)} · {partySize} guests</p>
          ) : null}
          <label className="block space-y-1">
            <span className="text-sm font-medium">Full name</span>
            <input
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              autoComplete="name"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Phone</span>
            <input
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              autoComplete="tel"
              required
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Email (optional)</span>
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Special requests</span>
            <textarea
              value={specialRequests}
              onChange={(e) => setSpecialRequests(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3 min-h-[80px]"
              maxLength={1000}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={accessibilityRequired}
              onChange={(e) => setAccessibilityRequired(e.target.checked)}
            />
            Accessible seating required
          </label>
          <label className="flex items-center gap-2 text-sm">
            High chairs
            <input
              type="number"
              min={0}
              max={10}
              value={highChairCount}
              onChange={(e) => setHighChairCount(Number(e.target.value) || 0)}
              className="w-16 rounded border border-border px-2 py-1"
            />
          </label>
          <Button
            type="button"
            className="bg-brand-red hover:bg-brand-red/90"
            disabled={!guestName.trim() || guestPhone.trim().length < 7}
            onClick={() => setStep("privacy")}
          >
            Continue
          </Button>
        </section>
      )}

      {step === "privacy" && (
        <section className="space-y-4">
          <button type="button" className="inline-flex items-center gap-1 text-sm text-muted-foreground" onClick={() => setStep("guest")}>
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <h2 className="font-[var(--font-display)] text-xl font-bold text-brand-charcoal">Privacy</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            We use your name and phone to manage this reservation and contact you about seating. You can cancel
            with the token shown after booking. We do not sell your details.
          </p>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={privacyAccepted}
              onChange={(e) => setPrivacyAccepted(e.target.checked)}
            />
            I understand and accept the privacy notice.
          </label>
          <Button
            type="button"
            className="bg-brand-red hover:bg-brand-red/90 w-full"
            disabled={!privacyAccepted || loading}
            onClick={() => void submitBooking()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm reservation"}
          </Button>
        </section>
      )}

      {step === "done" && confirmation && (
        <section className="space-y-4 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
          <h2 className="font-[var(--font-display)] text-2xl font-bold text-brand-charcoal">Booked</h2>
          <p className="text-muted-foreground">
            Reservation <span className="font-semibold text-brand-charcoal">{confirmation.reservationNumber}</span>
          </p>
          <p className="text-sm">{formatSlotLabel(confirmation.startAt, confirmation.timezone)}</p>
          {confirmation.cancellationToken ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left text-sm">
              <p className="font-semibold text-amber-900 mb-2">Cancellation token (shown once)</p>
              <code className="block break-all text-amber-950">{confirmation.cancellationToken}</code>
              <p className="mt-2 text-amber-800">
                Save this token to cancel at{" "}
                <Link href="/book/cancel" className="underline">
                  /book/cancel
                </Link>
                .
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This was an idempotent replay — the cancellation token was already issued earlier.
            </p>
          )}
          <Button type="button" variant="outline" asChild>
            <Link href="/">Back home</Link>
          </Button>
        </section>
      )}
    </div>
  );
}

function PublicCancelFlow() {
  const [reservationNumber, setReservationNumber] = useState("");
  const [cancellationToken, setCancellationToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ reservationNumber: string; status: string } | null>(null);

  async function onCancel() {
    setLoading(true);
    setError(null);
    try {
      const data = await cancelPublicReservation(reservationNumber.trim(), cancellationToken.trim());
      setDone({ reservationNumber: data.reservationNumber, status: data.status });
    } catch (err) {
      setError(mapPublicBookingError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h2 className="font-[var(--font-display)] text-xl font-bold text-brand-charcoal">Cancel a reservation</h2>
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      ) : null}
      {done ? (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
          Reservation {done.reservationNumber} is now <strong>{done.status}</strong>.
        </div>
      ) : (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Reservation number</span>
            <input
              value={reservationNumber}
              onChange={(e) => setReservationNumber(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
              placeholder="RES-…"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Cancellation token</span>
            <input
              value={cancellationToken}
              onChange={(e) => setCancellationToken(e.target.value)}
              className="w-full rounded-xl border border-border px-4 py-3"
            />
          </label>
          <Button
            type="button"
            className="bg-brand-red hover:bg-brand-red/90"
            disabled={loading || !reservationNumber.trim() || cancellationToken.trim().length < 16}
            onClick={() => void onCancel()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Cancel reservation"}
          </Button>
        </>
      )}
      <p className="text-sm text-muted-foreground">
        <Link href="/book" className="underline">
          Book a table instead
        </Link>
      </p>
    </div>
  );
}

export default function PublicBooking() {
  const [location] = useLocation();
  const isCancel = location.startsWith("/book/cancel");

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/80 via-background to-background">
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(220,38,38,0.12),_transparent_55%)]" />
        <div className="container relative py-12 md:py-16 text-center">
          <p className="text-sm font-semibold tracking-wide text-brand-red uppercase mb-2">Telepizza</p>
          <h1 className="font-[var(--font-display)] text-3xl md:text-4xl font-extrabold text-brand-charcoal">
            {isCancel ? "Cancel booking" : "Book a table"}
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            {isCancel
              ? "Use your reservation number and the cancellation token shown at booking."
              : "Reserve a table online. Availability is confirmed on the server when you submit."}
          </p>
        </div>
      </section>
      <section className="container py-10 pb-20">{isCancel ? <PublicCancelFlow /> : <PublicBookingFlow />}</section>
    </div>
  );
}
