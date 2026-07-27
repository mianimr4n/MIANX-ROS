import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { useOperationalData } from "@/lib/op-status";
import { fetchOpeningReadiness } from "@/lib/admin-api";
import { computeOpeningCountdown } from "@/lib/opening-countdown";

const GRADE_STYLES: Record<string, string> = {
  READY: "bg-emerald-50 text-emerald-900 border-emerald-200",
  READY_WITH_LIMITATIONS: "bg-amber-50 text-amber-950 border-amber-200",
  BLOCKED: "bg-red-50 text-red-900 border-red-200",
  NOT_VERIFIED: "bg-[var(--admin-soft)] text-[var(--admin-muted)] border-[var(--admin-border)]",
};

const GRADE_LABELS: Record<string, string> = {
  READY: "Ready to open",
  READY_WITH_LIMITATIONS: "Ready with limitations",
  BLOCKED: "Setup needed",
  NOT_VERIFIED: "Not verified yet",
};

/** Plain-language titles for known launch-blocker codes. */
const BLOCKER_LABELS: Record<string, string> = {
  STATUS_NOT_OPERATING: "Branch not switched to operating",
  PHONE_MISSING: "Phone number missing",
  HOURS_MISSING: "Opening hours missing",
  MANAGER_MISSING: "Branch manager not assigned",
  CASHIER_MISSING: "Cashier not assigned",
  KITCHEN_MISSING: "Kitchen staff not assigned",
  RIDER_MISSING: "Delivery rider not assigned",
  HOST_MISSING: "Host not assigned",
  WAITER_MISSING: "Waiter not assigned",
  FLOOR_MISSING: "Floor plan and tables missing",
  BOOKING_POLICY_MISSING: "Booking policy not set",
  PAYMENT_NOT_VERIFIED: "Payment setup not verified",
  NOTIFICATION_NOT_VERIFIED: "Notifications not set up",
  DEVICE_NOT_VERIFIED: "On-site devices not verified",
  PROBE_FAILED: "Readiness check could not run",
};

function blockerTitle(code: string): string {
  if (BLOCKER_LABELS[code]) return BLOCKER_LABELS[code];
  const words = code.toLowerCase().replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function statusLabel(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "coming-soon") return "Coming soon";
  if (normalized === "operating" || normalized === "active") return "Operating";
  const words = normalized.replaceAll("-", " ").replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function checkEntries(checks: Record<string, boolean>) {
  return Object.entries(checks).map(([key, ok]) => ({
    key,
    label: key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()),
    ok,
  }));
}

/**
 * Opening readiness panel — stored configuration + staffing only.
 * Coming-soon branches must not invent live sales/order KPIs here.
 */
export function OpeningReadinessSummary({
  token,
  branchId,
  enabled,
  showTechnicalDetail = false,
}: {
  token: string | undefined;
  branchId: string | null;
  enabled: boolean;
  showTechnicalDetail?: boolean;
}) {
  const ready = Boolean(token) && Boolean(branchId) && enabled;
  const op = useOperationalData(
    ({ signal, correlationId }) => fetchOpeningReadiness(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    { enabled: ready, pollMs: 120_000 },
  );

  const data = op.data;
  const grade = data?.readinessGrade ?? (data?.operationallyActive ? "READY_WITH_LIMITATIONS" : "BLOCKED");
  const comingSoon = String(data?.status ?? "").toLowerCase() === "coming-soon";
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (!ready || comingSoon) return;
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, [comingSoon, ready]);
  const countdown = useMemo(() => computeOpeningCountdown(now.getTime(), false), [now]);

  if (!ready) return null;

  return (
    <section aria-label="Opening readiness" className="mb-8">
      <AdminSectionTitle
        eyebrow="Opening"
        title="Opening readiness"
        description={
          comingSoon
            ? "This branch is coming soon. Finish the setup steps below before live service — no live sales are shown until it opens. Countdown stays with Royal Orchard operating launch and is not inherited here."
            : "Staffing, phone, hours, floor, booking, and device checks for launch."
        }
      />
      {!comingSoon ? (
        <p className="mb-3 text-sm text-[var(--admin-muted)]" aria-live="polite">
          Opening countdown: <strong className="text-[var(--admin-ink)]">{countdown.label}</strong>
          <span className="ml-2 text-xs">(14 Aug 2026 · 10:00 Asia/Karachi)</span>
        </p>
      ) : null}
      <OperationalStatusBanner
        state={op.state}
        error={op.error}
        lastSuccessAt={op.lastSuccessAt}
        onRetry={op.retry}
        correlationId={op.correlationId}
        showTechnicalDetail={showTechnicalDetail}
      />

      {op.state === "LOADING" && !data ? (
        <div className="h-28 animate-pulse rounded-2xl bg-[var(--admin-soft)] motion-reduce:animate-none" aria-hidden />
      ) : null}

      {data ? (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--admin-ink)]">
                {data.name}{" "}
                <span className="font-normal text-[var(--admin-muted)]">({data.branchCode})</span>
              </p>
              <p className="mt-1 text-xs text-[var(--admin-muted)]">Status: {statusLabel(String(data.status))}</p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${GRADE_STYLES[grade] ?? GRADE_STYLES.NOT_VERIFIED}`}
            >
              {GRADE_LABELS[grade] ?? blockerTitle(String(grade))}
            </span>
          </div>

          {data.blockers.length > 0 ? (
            <ul className="mt-4 space-y-2" aria-label="Setup steps before opening">
              {data.blockers.map((b) => (
                <li
                  key={b.code}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                >
                  <span className="font-medium">{blockerTitle(b.code)}</span> — {b.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-emerald-800">All stored opening checks are complete.</p>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {checkEntries(data.checks).map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2 text-xs"
              >
                <span className="text-[var(--admin-muted)]">{c.label}</span>
                <span className={c.ok ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                  {c.ok ? "Done" : "Missing"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <Link
              href="/admin/settings"
              className="inline-flex min-h-11 items-center rounded-xl bg-[var(--brand-red-dark)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red-dark)] motion-reduce:transition-none"
            >
              Complete opening readiness
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
