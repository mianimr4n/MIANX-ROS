import { Link } from "wouter";

import type { CrmCustomer } from "@/lib/admin-crm";
import { formatOrderDateTime, formatPkr } from "@/lib/admin-order-format";
import type { AdminOrderListItem } from "@/lib/admin-api";
import { externalWhatsAppHandoffUrl } from "@/lib/admin-whatsapp";
import { BRAND } from "@/lib/brand";

export function CustomerContextPanel({
  order,
  customer,
  branchLabelById,
}: {
  order: AdminOrderListItem | null;
  customer: CrmCustomer | null;
  branchLabelById: Record<string, string>;
}) {
  if (!order) {
    return (
      <section
        aria-labelledby="whatsapp-customer-context-heading"
        className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 text-sm text-[var(--admin-muted)]"
      >
        <h2 id="whatsapp-customer-context-heading" className="text-sm font-semibold text-[var(--admin-ink)]">
          Customer context
        </h2>
        <p className="mt-2">Select a WhatsApp-attributed order to view order-derived customer context.</p>
      </section>
    );
  }

  const handoffUrl = externalWhatsAppHandoffUrl(
    BRAND.phone,
    `Hi Telepizza, regarding order ${order.orderNumber}.`,
  );

  return (
    <section aria-labelledby="whatsapp-customer-context-heading" className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
      <h2 id="whatsapp-customer-context-heading" className="text-sm font-semibold">
        Customer context
      </h2>
      <p className="mt-1 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">Order-derived customer profile</p>

      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--admin-muted)]">Name</dt>
          <dd>{order.contactName || "Guest"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--admin-muted)]">Phone</dt>
          <dd className="tabular-nums">{order.contactPhone || "—"}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-[var(--admin-muted)]">Branch</dt>
          <dd>{branchLabelById[order.branchId] ?? order.branchCode ?? "—"}</dd>
        </div>
        {customer ? (
          <>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--admin-muted)]">Orders in window</dt>
              <dd>{customer.orderCount}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--admin-muted)]">Lifetime spend</dt>
              <dd className="tabular-nums">{formatPkr(customer.lifetimeSpend)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--admin-muted)]">Last order</dt>
              <dd>{formatOrderDateTime(customer.lastOrderAt)}</dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {customer ? (
          <Link
            href={`/admin/crm?selected=${encodeURIComponent(customer.id)}`}
            className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
          >
            Open CRM
          </Link>
        ) : null}
        <Link
          href={`/admin/orders?orderSource=whatsapp&orderNumber=${encodeURIComponent(order.orderNumber)}`}
          className="min-h-10 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-semibold hover:bg-[var(--admin-soft)]"
        >
          View orders
        </Link>
        <Link
          href="/admin/pos"
          className="min-h-10 rounded-lg bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-red-dark)]"
        >
          Start POS order
        </Link>
        <a
          href={handoffUrl}
          target="_blank"
          rel="noreferrer"
          className="min-h-10 rounded-lg border border-dashed border-[var(--admin-border)] px-3 py-2 text-sm font-semibold text-[var(--admin-muted)] hover:bg-[var(--admin-soft)]"
        >
          External WhatsApp handoff
        </a>
      </div>
      <p className="mt-2 text-xs text-[var(--admin-muted)]">
        External handoff opens wa.me — not tracked provider messaging.
      </p>
    </section>
  );
}
