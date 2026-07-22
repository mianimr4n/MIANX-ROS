import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { WhatsAppKpiSnapshot } from "@/lib/admin-whatsapp";
import { formatPkr } from "@/lib/admin-order-format";

export function WhatsAppKPIs({
  snapshot,
  loading,
  windowNote,
}: {
  snapshot: WhatsAppKpiSnapshot | null;
  loading: boolean;
  windowNote: string;
}) {
  return (
    <section aria-label="WhatsApp key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="WhatsApp"
        title="Operational KPIs"
        description={`${windowNote} Conversation metrics require message storage.`}
      />
      {loading && !snapshot ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[7.25rem] animate-pulse rounded-2xl bg-[var(--admin-soft)]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminKpiCard
            title="WhatsApp orders"
            value={String(snapshot?.whatsappOrders ?? 0)}
            source="DERIVED"
            detail="order_source=whatsapp in loaded window"
          />
          <AdminKpiCard
            title="WhatsApp revenue"
            value={formatPkr(snapshot?.whatsappRevenue ?? 0)}
            source="DERIVED"
            detail="Sum of totals in loaded window"
          />
          <AdminKpiCard
            title="Active orders"
            value={String(snapshot?.activeOrders ?? 0)}
            source="DERIVED"
            detail="Excludes completed/cancelled/delivered"
          />
          <AdminKpiCard
            title="Pending orders"
            value={String(snapshot?.pendingOrders ?? 0)}
            source="DERIVED"
            detail="Awaiting staff confirmation"
          />
          <AdminKpiCard
            title="Average order value"
            value={snapshot?.averageOrderValue != null ? formatPkr(snapshot.averageOrderValue) : "—"}
            source={snapshot?.averageOrderValue != null ? "DERIVED" : "UNAVAILABLE"}
            unavailable={snapshot?.averageOrderValue == null}
            detail="Mean order total in window"
          />
          <AdminKpiCard
            title="Open conversations"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="No conversation storage"
          />
          <AdminKpiCard
            title="Unread conversations"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="No message inbox API"
          />
          <AdminKpiCard
            title="First response time"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="Requires inbound message timestamps"
          />
          <AdminKpiCard
            title="Failed messages"
            value="—"
            source="UNAVAILABLE"
            unavailable
            detail="Requires provider delivery webhooks"
          />
          <AdminKpiCard
            title="Active agents"
            value="—"
            source="FOUNDATION"
            unavailable
            detail="Conversation assignment not implemented"
          />
        </div>
      )}
    </section>
  );
}
