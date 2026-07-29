/**
 * Opening M1 — booking policy lifecycle UI (draft → review → Founder approve → activate).
 */
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ApiRequestError } from "@/lib/api";
import {
  activateBookingPolicy,
  approveBookingPolicy,
  createBookingPolicyDraft,
  fetchCurrentBookingPolicy,
  listBookingPolicyVersions,
  retireBookingPolicy,
  submitBookingPolicy,
  type BookingPolicy,
} from "@/lib/admin-api";

function errText(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

function honesty(status: string, problem: string, next: string) {
  return (
    <dl className="mt-2 grid gap-1 text-sm text-[var(--admin-muted)] sm:grid-cols-3">
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Status</dt>
        <dd>{status}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Problem</dt>
        <dd>{problem}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Next action</dt>
        <dd>{next}</dd>
      </div>
    </dl>
  );
}

function policyHonesty(policy: BookingPolicy | null) {
  if (!policy) {
    return honesty(
      "SETUP REQUIRED",
      "No booking policy exists for this branch.",
      "Create a draft policy, then submit for Founder approval.",
    );
  }
  if (policy.status === "ACTIVE" && policy.approvedAt) {
    return honesty("ACTIVE", "None.", "Monitor party-size and advance windows; retire only when replacing.");
  }
  if (policy.status === "APPROVED") {
    return honesty(
      "APPROVED",
      "Policy is approved but not yet activated.",
      "Founder must explicitly activate — unapproved policies cannot appear ACTIVE.",
    );
  }
  if (policy.status === "REVIEW_REQUIRED") {
    return honesty(
      "REVIEW_REQUIRED",
      "Awaiting Founder approval (super-admin).",
      "Founder reviews and approves, then activates.",
    );
  }
  if (policy.status === "DRAFT") {
    return honesty(
      "DRAFT",
      "Draft policy is not approved and does not satisfy readiness.",
      "Submit for Founder review when ready.",
    );
  }
  return honesty(policy.status, "Policy is not ACTIVE.", "Create a new draft or activate an approved version.");
}

export function BookingPolicyPanel() {
  const { session, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;
  const canDraft = isSuperAdmin || roles.includes("branch-manager");

  const [current, setCurrent] = useState<BookingPolicy | null>(null);
  const [versions, setVersions] = useState<BookingPolicy[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token || !branchId) return;
    setBusy(true);
    try {
      const [cur, hist] = await Promise.all([
        fetchCurrentBookingPolicy(token, branchId),
        listBookingPolicyVersions(token, branchId),
      ]);
      setCurrent(cur);
      setVersions(hist);
      setError(null);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }, [token, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-sm"
      aria-labelledby="booking-policy-heading"
    >
      <h2 id="booking-policy-heading" className="text-lg font-semibold text-[var(--admin-ink)]">
        Booking policy
      </h2>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">
        One effective ACTIVE policy per branch for {branchLabel}. Founder approval is required before
        activation.
      </p>
      {policyHonesty(current)}

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {current ? (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-[var(--admin-muted)]">Version / status</dt>
            <dd className="font-semibold">
              v{current.version} · {current.status}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Booking enabled</dt>
            <dd className="font-semibold">{current.bookingEnabled ? "yes" : "no"}</dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Party size</dt>
            <dd className="font-semibold">
              {current.minimumPartySize}–{current.maximumPartySize}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Advance window</dt>
            <dd className="font-semibold">
              {current.minimumAdvanceMinutes}m / {current.maximumAdvanceDays}d
            </dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Cancellation / grace / hold</dt>
            <dd className="font-semibold">
              {current.cancellationWindowMinutes}m / {current.gracePeriodMinutes}m /{" "}
              {current.tableHoldMinutes}m
            </dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Waitlist</dt>
            <dd className="font-semibold">{current.waitlistEnabled ? "enabled" : "disabled"}</dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Approval</dt>
            <dd className="font-semibold">
              {current.approvedAt ? new Date(current.approvedAt).toLocaleString() : "not approved"}
            </dd>
          </div>
          <div>
            <dt className="text-[var(--admin-muted)]">Effective from</dt>
            <dd className="font-semibold">
              {current.effectiveFrom ? new Date(current.effectiveFrom).toLocaleString() : "—"}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-sm text-[var(--admin-muted)]">
          {busy ? "Loading policy…" : "No policy loaded."}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {canDraft ? (
          <button
            type="button"
            disabled={busy || !branchId}
            className="min-h-11 rounded-md border px-3 text-sm font-semibold disabled:opacity-50"
            onClick={() =>
              void run(() =>
                createBookingPolicyDraft(token!, {
                  branchId: branchId!,
                  bookingEnabled: false,
                  minimumPartySize: 1,
                  maximumPartySize: 10,
                }),
              )
            }
          >
            Create draft
          </button>
        ) : null}
        {current && canDraft && current.status === "DRAFT" ? (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-md border px-3 text-sm font-semibold disabled:opacity-50"
            onClick={() => void run(() => submitBookingPolicy(token!, current.id))}
          >
            Submit for review
          </button>
        ) : null}
        {current && isSuperAdmin && (current.status === "DRAFT" || current.status === "REVIEW_REQUIRED") ? (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-md bg-[var(--brand-red)] px-3 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void run(() => approveBookingPolicy(token!, current.id))}
          >
            Founder approve
          </button>
        ) : null}
        {current && isSuperAdmin && current.status === "APPROVED" ? (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-md bg-[var(--brand-red)] px-3 text-sm font-semibold text-white disabled:opacity-50"
            onClick={() => void run(() => activateBookingPolicy(token!, current.id))}
          >
            Activate
          </button>
        ) : null}
        {current && isSuperAdmin && current.status === "ACTIVE" ? (
          <button
            type="button"
            disabled={busy}
            className="min-h-11 rounded-md border px-3 text-sm font-semibold disabled:opacity-50"
            onClick={() => void run(() => retireBookingPolicy(token!, current.id))}
          >
            Retire
          </button>
        ) : null}
      </div>

      {versions.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Version history</h3>
          <ul className="mt-2 space-y-1 text-sm text-[var(--admin-muted)]">
            {versions.map((v) => (
              <li key={v.id}>
                v{v.version} · {v.status}
                {v.approvedAt ? ` · approved ${new Date(v.approvedAt).toLocaleDateString()}` : ""}
                {v.status === "ACTIVE" ? " · current" : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
