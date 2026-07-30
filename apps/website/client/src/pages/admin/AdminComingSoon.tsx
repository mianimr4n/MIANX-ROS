import { Link } from "wouter";

import { AdminShell } from "./AdminShell";

export default function AdminComingSoon({ moduleName }: { moduleName: string }) {
  return (
    <AdminShell title={moduleName}>
      <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)] p-8">
        <span className="inline-flex rounded-full bg-[var(--admin-soft)] px-3 py-1 text-xs font-semibold text-[var(--admin-muted)]">
          Planned for Phase 2
        </span>
        <h2 className="mt-3 text-2xl font-semibold">{moduleName}</h2>
        <p className="mt-3 text-sm text-[var(--admin-muted)]">
          This area is reserved for a future release. Nothing is missing from today&apos;s operating tools — check back
          when Phase 2 ships.
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
