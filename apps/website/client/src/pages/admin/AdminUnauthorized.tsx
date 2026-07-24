import { Link } from "wouter";

import { AdminShell } from "./AdminShell";

export default function AdminUnauthorized() {
  return (
    <AdminShell title="Unauthorized">
      <div className="mx-auto max-w-lg rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-red)]">Access denied</p>
        <h2 className="mt-2 text-2xl font-semibold">You cannot open this module</h2>
        <p className="mt-3 text-sm text-[var(--admin-muted)]">
          Your account is authenticated, but this Admin ERP area requires additional permissions.
          Contact a Super Admin if you believe this is a mistake.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/admin/dashboard"
            className="rounded-lg bg-[var(--brand-red)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
          >
            Back to dashboard
          </Link>
          <Link
            href="/admin/login"
            className="rounded-lg border border-[var(--admin-border)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--admin-soft)]"
          >
            Switch account
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
