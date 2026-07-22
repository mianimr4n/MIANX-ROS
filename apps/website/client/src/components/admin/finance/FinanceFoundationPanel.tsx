import type { FinanceIntegrationCheck, FinanceReadinessGroup } from "@/lib/admin-finance";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { Link } from "wouter";

export function FinanceFoundationPanel({ checks }: { checks: FinanceIntegrationCheck[] }) {
  return (
    <AdminSurface aria-labelledby="finance-integration-heading" className="mb-6">
      <AdminSurfaceHeader title="Integration readiness" description="Verified repository dependencies for accounting." />
      <AdminSurfaceBody>
        <h2 id="finance-integration-heading" className="sr-only">
          Finance integration readiness
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
          Related modules:{" "}
          <Link href="/admin/orders" className="font-semibold text-[var(--brand-red)] underline">
            Orders
          </Link>
          {" · "}
          <Link href="/admin/purchasing" className="font-semibold text-[var(--brand-red)] underline">
            Purchasing
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

export function FinanceReadinessSections({ groups }: { groups: FinanceReadinessGroup[] }) {
  return (
    <section aria-labelledby="finance-readiness-sections" className="mb-6 grid gap-4 lg:grid-cols-2">
      <h2 id="finance-readiness-sections" className="sr-only">
        Finance foundation requirements
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
