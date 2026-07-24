import { Link } from "wouter";

import type { ReportsIntegrationCheck, ReportsReadinessGroup } from "@/lib/admin-reports";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function ReportsFoundationPanel({ checks }: { checks: ReportsIntegrationCheck[] }) {
  return (
    <AdminSurface aria-labelledby="reports-integration-heading" className="mb-6">
      <AdminSurfaceHeader title="Integration readiness" description="Verified repository reporting dependencies." />
      <AdminSurfaceBody>
        <h2 id="reports-integration-heading" className="sr-only">
          Reports integration readiness
        </h2>
        <ul className="space-y-2">
          {checks.map((check) => (
            <li
              key={check.id}
              className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-[var(--admin-border)] bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium">{check.label}</p>
                <p className="mt-0.5 text-xs text-[var(--admin-muted)]">{check.note}</p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  check.status === "present"
                    ? "bg-emerald-50 text-emerald-900"
                    : check.status === "partial" || check.status === "derived"
                      ? "bg-sky-50 text-sky-900"
                      : "bg-[var(--admin-soft)] text-[var(--admin-muted)]"
                }`}
              >
                {check.status}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          Related:{" "}
          <Link href="/admin/dashboard" className="font-semibold text-[var(--brand-red)] underline">
            Executive Dashboard
          </Link>
          {" · "}
          <Link href="/admin/finance" className="font-semibold text-[var(--brand-red)] underline">
            Finance
          </Link>
          {" · "}
          <Link href="/admin/inventory" className="font-semibold text-[var(--brand-red)] underline">
            Inventory
          </Link>
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ReportsReadinessSections({ groups }: { groups: ReportsReadinessGroup[] }) {
  return (
    <section aria-labelledby="reports-readiness-sections" className="mb-6 grid gap-4 lg:grid-cols-2">
      <h2 id="reports-readiness-sections" className="sr-only">
        Reports foundation requirements
      </h2>
      {groups.map((group) => (
        <article key={group.id} className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <h3 className="text-sm font-semibold">{group.title}</h3>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">Unavailable: {group.unavailable}</p>
          <p className="mt-2 text-sm">{group.why}</p>
          <dl className="mt-3 space-y-2 text-xs text-[var(--admin-muted)]">
            <div>
              <dt className="font-semibold uppercase tracking-wide">Entities</dt>
              <dd className="mt-1">{group.entities.join(" · ")}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide">APIs</dt>
              <dd className="mt-1">{group.apis.join(" · ")}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide">Permission</dt>
              <dd className="mt-1">{group.permission}</dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wide">Dependencies</dt>
              <dd className="mt-1">{group.related}</dd>
            </div>
          </dl>
        </article>
      ))}
    </section>
  );
}
