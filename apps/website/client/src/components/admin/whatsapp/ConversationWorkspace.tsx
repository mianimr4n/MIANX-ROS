import { MessageComposer } from "@/components/admin/whatsapp/MessageComposer";

export function ConversationWorkspace({
  hasSelection,
}: {
  hasSelection: boolean;
}) {
  return (
    <section
      aria-labelledby="conversation-workspace-heading"
      className="flex h-full min-h-[24rem] flex-col rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)]"
    >
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <h2 id="conversation-workspace-heading" className="text-sm font-semibold">
          Conversation workspace
        </h2>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">Provider message history is not available.</p>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div
          className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-8 text-center text-sm text-[var(--admin-muted)]"
          role="status"
        >
          <div>
            <p className="font-semibold text-[var(--admin-ink)]">Conversation history unavailable</p>
            <p className="mt-2">
              The current repository does not contain persistent WhatsApp messages or provider webhook storage.
            </p>
            {hasSelection ? (
              <p className="mt-2 text-xs">
                Use the linked order panel and order activity below for operational context on the selected
                WhatsApp-attributed order.
              </p>
            ) : (
              <p className="mt-2 text-xs">Select a WhatsApp-attributed order from the queue to review order context.</p>
            )}
          </div>
        </div>

        <MessageComposer />
      </div>
    </section>
  );
}
