import { AdminKpiCard, AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { WhatsAppKpiSnapshot } from "@/lib/admin-whatsapp";
import { formatPkr } from "@/lib/admin-order-format";

export function WhatsAppKPIs({
  snapshot,
  loading,
  windowNote,
  conversationStats,
}: {
  snapshot: WhatsAppKpiSnapshot | null;
  loading: boolean;
  windowNote: string;
  conversationStats?: {
    openCount: number | null;
    unreadCount: number | null;
    failedMessages: number | null;
    activeAgents: number | null;
  } | null;
}) {
  return (
    <section aria-label="WhatsApp key performance indicators" className="mb-6">
      <AdminSectionTitle
        eyebrow="WhatsApp"
        title="Operational KPIs"
        description={`${windowNote} Conversation metrics from ADR-004 message store.`}
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
            value={conversationStats?.openCount != null ? String(conversationStats.openCount) : "—"}
            source={conversationStats?.openCount != null ? "LIVE" : "UNAVAILABLE"}
            unavailable={conversationStats?.openCount == null}
            detail="status IN (open, in_progress, escalated)"
          />
          <AdminKpiCard
            title="Unread conversations"
            value={conversationStats?.unreadCount != null ? String(conversationStats.unreadCount) : "—"}
            source={conversationStats?.unreadCount != null ? "LIVE" : "UNAVAILABLE"}
            unavailable={conversationStats?.unreadCount == null}
            detail="unread_count > 0 across open conversations"
          />
          <AdminKpiCard
            title="First response time"
            value="—"
            source="FOUNDATION"
            unavailable
            detail="Aggregation pipeline queued (Phase 2.3 CRM analytics)"
          />
          <AdminKpiCard
            title="Failed messages"
            value={conversationStats?.failedMessages != null ? String(conversationStats.failedMessages) : "—"}
            source={conversationStats?.failedMessages != null ? "LIVE" : "UNAVAILABLE"}
            unavailable={conversationStats?.failedMessages == null}
            detail="delivery_status=failed OR permanently_failed"
          />
          <AdminKpiCard
            title="Active agents"
            value={conversationStats?.activeAgents != null ? String(conversationStats.activeAgents) : "—"}
            source={conversationStats?.activeAgents != null ? "LIVE" : "UNAVAILABLE"}
            unavailable={conversationStats?.activeAgents == null}
            detail="Distinct assigned_agent_id in open conversations"
          />
        </div>
      )}
    </section>
  );
}
