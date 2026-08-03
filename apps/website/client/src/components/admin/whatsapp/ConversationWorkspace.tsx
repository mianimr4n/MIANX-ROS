/**
 * Honest placeholder — no conversation store exists.
 * Does not render composer/inbox chrome that implies live messaging.
 */
export function ConversationWorkspace({
  hasSelection,
}: {
  hasSelection: boolean;
}) {
  return (
    <section
      aria-labelledby="conversation-workspace-heading"
      className="flex h-full min-h-[16rem] flex-col rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-panel)]"
      data-testid="whatsapp-no-conversation-store"
    >
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <h2 id="conversation-workspace-heading" className="text-sm font-semibold">
          No conversation store
        </h2>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Provider messages, unread counts, and composer actions are not available in this repository.
        </p>
      </div>

      <div
        className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-[var(--admin-muted)]"
        role="status"
      >
        <div>
          <p className="font-semibold text-[var(--admin-ink)]">Order context only</p>
          <p className="mt-2">
            Use the order queue and linked order panel for WhatsApp-attributed order operations. Messaging requires a
            future provider integration.
          </p>
          {hasSelection ? (
            <p className="mt-2 text-xs">A WhatsApp-attributed order is selected — review linked order details beside this panel.</p>
          ) : (
            <p className="mt-2 text-xs">Select a WhatsApp-attributed order from the queue to review order context.</p>
          )}
        </div>
      </div>
    </section>
  );
}
