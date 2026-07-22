import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { SettingsInsightItem } from "@/lib/admin-settings";
import type { SettingsCapabilityRow, SettingsIntegrationCheck } from "@/lib/admin-settings";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { Link } from "wouter";

const SOURCE_CLASS: Record<SettingsInsightItem["source"], string> = {
  derived: "bg-sky-50 text-sky-800",
  foundation: "bg-[var(--admin-soft)] text-[var(--admin-muted)]",
  "read-only": "bg-sky-50 text-sky-800",
};

export function ConfigurationInsights({ items }: { items: SettingsInsightItem[] }) {
  return (
    <section
      aria-labelledby="configuration-insights-heading"
      className="mb-8 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 md:p-5"
    >
      <AdminSectionTitle
        eyebrow="Mianx.ai"
        title="Mianx.ai Configuration Insights"
        description="Rule-based Summary only — readiness signals from verified repository posture."
      />
      <h2 id="configuration-insights-heading" className="sr-only">
        Configuration insights
      </h2>
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="rounded-xl border border-[var(--admin-border)] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{item.title}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${SOURCE_CLASS[item.source]}`}
              >
                {item.source}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--admin-muted)]">{item.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-[var(--admin-muted)]">
        Missing tax configuration · Payment provider not configured · WhatsApp backend unavailable · Loyalty ledger
        unavailable · No prediction models from this workspace.
      </p>
    </section>
  );
}

export function SettingsIntegrationReadiness({ checks }: { checks: SettingsIntegrationCheck[] }) {
  return (
    <AdminSurface aria-labelledby="settings-integration-heading" className="mb-6">
      <AdminSurfaceHeader title="Configuration readiness" description="Verified repository settings dependencies." />
      <AdminSurfaceBody>
        <h2 id="settings-integration-heading" className="sr-only">
          Settings integration readiness
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
                    : check.status === "partial" || check.status === "derived" || check.status === "environment"
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
          <Link href="/admin/hr" className="font-semibold text-[var(--brand-red)] underline">
            HR
          </Link>
          {" · "}
          <Link href="/admin/finance" className="font-semibold text-[var(--brand-red)] underline">
            Finance
          </Link>
          {" · "}
          <Link href="/admin/menu" className="font-semibold text-[var(--brand-red)] underline">
            Menu
          </Link>
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function SettingsCapabilityMatrix({ rows }: { rows: SettingsCapabilityRow[] }) {
  return (
    <AdminSurface aria-labelledby="settings-capability-matrix" className="mb-6">
      <AdminSurfaceHeader title="Capability matrix (summary)" description="Discovery decisions for founder review." />
      <AdminSurfaceBody className="overflow-x-auto pt-0">
        <h2 id="settings-capability-matrix" className="sr-only">
          Settings capability matrix
        </h2>
        <table className="min-w-full text-left text-xs">
          <thead className="bg-[var(--admin-soft)] text-[var(--admin-muted)]">
            <tr>
              <th scope="col" className="px-2 py-2 font-semibold">
                Domain
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Classification
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Write API
              </th>
              <th scope="col" className="px-2 py-2 font-semibold">
                Decision
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.domain}-${row.capability}`} className="border-t border-[var(--admin-border)]">
                <td className="px-2 py-2 font-medium">{row.domain}</td>
                <td className="px-2 py-2">{row.classification}</td>
                <td className="px-2 py-2">{row.writeApi}</td>
                <td className="px-2 py-2 text-[var(--admin-muted)]">{row.decision}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
