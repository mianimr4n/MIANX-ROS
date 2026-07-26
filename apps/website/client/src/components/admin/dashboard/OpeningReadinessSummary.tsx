import { Link } from "wouter";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { useOperationalData } from "@/lib/op-status";
import { fetchOpeningReadiness } from "@/lib/admin-api";

const GRADE_STYLES: Record<string, string> = {
  READY: "bg-emerald-50 text-emerald-900 border-emerald-200",
  READY_WITH_LIMITATIONS: "bg-amber-50 text-amber-950 border-amber-200",
  BLOCKED: "bg-red-50 text-red-900 border-red-200",
  NOT_VERIFIED: "bg-[var(--admin-soft)] text-[var(--admin-muted)] border-[var(--admin-border)]",
};

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

  if (!ready) return null;

  const data = op.data;
  const grade = data?.readinessGrade ?? (data?.operationallyActive ? "READY_WITH_LIMITATIONS" : "BLOCKED");
  const comingSoon = String(data?.status ?? "").toLowerCase() === "coming-soon";

  return (
    <section aria-label="Opening readiness" className="mb-8">
      <AdminSectionTitle
        eyebrow="Opening"
        title="Opening readiness"
        description={
          comingSoon
            ? "This branch is coming soon. Complete configuration blockers before live service — no fabricated sales KPIs."
            : "Staffing, phone, hours, floor, booking, and device verification for launch."
        }
      />
      <OperationalStatusBanner
        state={op.state}
        error={op.error}
        lastSuccessAt={op.lastSuccessAt}
        onRetry={op.retry}
        correlationId={op.correlationId}
        showTechnicalDetail={showTechnicalDetail}
      />

      {op.state === "LOADING" && !data ? (
        <div className="h-28 animate-pulse rounded-2xl bg-[var(--admin-soft)]" aria-hidden />
      ) : null}

      {data ? (
        <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[var(--admin-ink)]">
                {data.name}{" "}
                <span className="font-normal text-[var(--admin-muted)]">({data.branchCode})</span>
              </p>
              <p className="mt-1 text-xs uppercase tracking-wide text-[var(--admin-muted)]">
                Status: {data.status}
              </p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${GRADE_STYLES[grade] ?? GRADE_STYLES.NOT_VERIFIED}`}
            >
              {String(grade).replaceAll("_", " ")}
            </span>
          </div>

          {data.blockers.length > 0 ? (
            <ul className="mt-4 space-y-2" aria-label="Launch blockers">
              {data.blockers.map((b) => (
                <li
                  key={b.code}
                  className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
                >
                  <span className="font-medium">{b.code}</span> — {b.message}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-emerald-800">No launch blockers reported for stored checks.</p>
          )}

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {checkEntries(data.checks).map((c) => (
              <div
                key={c.key}
                className="flex items-center justify-between rounded-xl border border-[var(--admin-border)] px-3 py-2 text-xs"
              >
                <span className="text-[var(--admin-muted)]">{c.label}</span>
                <span className={c.ok ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                  {c.ok ? "OK" : "Missing"}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <Link
              href="/admin/settings"
              className="inline-flex rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-700"
            >
              Complete Opening Readiness
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}
