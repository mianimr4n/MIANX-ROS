import type { ProcurementIntegrationCheck, ProcurementReadinessGroup } from "@/lib/admin-purchasing";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";
import { Link } from "wouter";

export function ProcurementFoundationPanel({ checks }: { checks: ProcurementIntegrationCheck[] }) {
  return (
    <AdminSurface aria-labelledby="procurement-integration-heading" className="mb-6">
      <AdminSurfaceHeader title="Integration readiness" description="Verified repository dependencies." />
      <AdminSurfaceBody>
        <h2 id="procurement-integration-heading" className="sr-only">
          Procurement integration readiness
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
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ProcurementReadinessSections({ groups }: { groups: ProcurementReadinessGroup[] }) {
  return (
    <section aria-labelledby="procurement-readiness-sections" className="mb-6 grid gap-4 lg:grid-cols-2">
      <h2 id="procurement-readiness-sections" className="sr-only">
        Procurement foundation requirements
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

export function ReceivingGrnPanel() {
  return (
    <AdminSurface aria-labelledby="receiving-grn-heading" className="mb-6">
      <AdminSurfaceHeader title="Receiving &amp; GRN" description="Goods receipt against purchase orders." />
      <AdminSurfaceBody>
        <h3 id="receiving-grn-heading" className="sr-only">
          Receiving and GRN
        </h3>
        <p className="text-sm font-semibold">Goods receiving unavailable</p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          GRN creation requires purchase orders, receipt lines, and inventory posting via stock movements. Frontend cannot
          increment stock balances.
        </p>
        <p className="mt-3 text-xs">
          <Link href="/admin/inventory" className="font-semibold text-[var(--brand-red)] hover:underline">
            Inventory Management
          </Link>{" "}
          — stock ledger also Foundation.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function InvoiceMatchingPanel() {
  return (
    <AdminSurface aria-labelledby="invoice-matching-heading" className="mb-6">
      <AdminSurfaceHeader title="Invoice matching" description="Three-way match: PO ↔ GRN ↔ supplier invoice." />
      <AdminSurfaceBody>
        <h3 id="invoice-matching-heading" className="sr-only">
          Invoice matching
        </h3>
        <p className="text-sm font-semibold">Invoice Matching Foundation</p>
        <p className="mt-2 text-sm text-[var(--admin-muted)]">
          Purchase-order, receipt, and supplier-invoice records are required before three-way matching can be performed.
          Customer payment records are not supplier payables.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
          Future link: Finance &amp; Accounting (Foundation)
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function SupplierPerformancePanel() {
  return (
    <AdminSurface aria-labelledby="supplier-performance-heading" className="mb-6">
      <AdminSurfaceHeader title="Supplier performance" description="Derived only from verified purchase and receipt events." />
      <AdminSurfaceBody>
        <h3 id="supplier-performance-heading" className="sr-only">
          Supplier performance
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          On-time delivery, fill rate, and price variance require historical PO and GRN data — unavailable in
          repository. No star ratings or AI supplier scores.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function ApprovalTimelinePanel() {
  return (
    <AdminSurface aria-labelledby="approval-timeline-heading" className="mb-6">
      <AdminSurfaceHeader title="Approval workflow" description="Server-side approval enforcement required." />
      <AdminSurfaceBody>
        <h3 id="approval-timeline-heading" className="sr-only">
          Approval timeline
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          FOUNDATION — server-side approval workflow required. No frontend-only approve/reject buttons.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function PurchaseDemandPanel() {
  return (
    <AdminSurface aria-labelledby="purchase-demand-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Purchase demand"
        description="Reorder-driven demand requires inventory balances and thresholds."
      />
      <AdminSurfaceBody>
        <h3 id="purchase-demand-heading" className="sr-only">
          Purchase demand
        </h3>
        <p className="text-sm text-[var(--admin-muted)]">
          Items below reorder level with suggested order quantities require stock balances, par levels, and preferred
          supplier linkage — all unavailable. No automatic PO creation.
        </p>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
