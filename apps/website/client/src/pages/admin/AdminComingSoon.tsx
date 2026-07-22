import { Link } from "wouter";

import { AdminShell } from "./AdminShell";

export default function AdminComingSoon({ moduleName }: { moduleName: string }) {
  return (
    <AdminShell title={moduleName}>
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--admin-muted)]">
          Reserved module
        </p>
        <h2 className="mt-2 text-2xl font-semibold">{moduleName}</h2>
        <p className="mt-3 text-sm text-[var(--admin-muted)]">
          This module is part of the Admin ERP roadmap and is not available in Foundation S1.
          No mock operational data is shown.
        </p>
        <Link
          href="/admin/dashboard"
          className="mt-6 inline-flex rounded-lg bg-[var(--brand-red)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
        >
          Return to operations overview
        </Link>
      </div>
    </AdminShell>
  );
}
