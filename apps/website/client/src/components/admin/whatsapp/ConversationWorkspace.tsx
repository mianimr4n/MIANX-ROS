/**
 * Conversation workspace (Phase 2.2 — live data from ADR-004 message store).
 *
 * Renders conversation list + message thread + composer. Calls the admin
 * WhatsApp API (`/admin/whatsapp/conversations` and friends). When no
 * conversation is selected, shows an empty state prompting the operator to
 * pick one from the list.
 */
import { useCallback, useEffect, useState } from "react";

import {
  listWhatsAppConversations,
  listWhatsAppMessages,
  sendWhatsAppMessage,
  type WhatsAppConversationListItem,
  type WhatsAppMessageRow,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { MessageComposer } from "./MessageComposer";

interface ConversationWorkspaceProps {
  accessToken: string | null;
  branchIdFilter?: string | null;
  hasOrderSelection: boolean;
}

export function ConversationWorkspace({
  accessToken,
  branchIdFilter,
  hasOrderSelection,
}: ConversationWorkspaceProps) {
  const [conversations, setConversations] = useState<WhatsAppConversationListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const loadConversations = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listWhatsAppConversations(accessToken, {
        limit: 50,
        offset: 0,
      });
      setConversations(result.conversations);
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Failed to load conversations.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      if (!accessToken) return;
      try {
        const rows = await listWhatsAppMessages(accessToken, conversationId, { limit: 100 });
        setMessages(rows);
      } catch (err) {
        const message = err instanceof ApiRequestError ? err.message : "Failed to load messages.";
        setError(message);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    void loadConversations();
  }, [loadConversations, branchIdFilter]);

  useEffect(() => {
    if (selectedId) void loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId, loadMessages]);

  const handleSend = async (text: string) => {
    if (!accessToken || !selectedId) return;
    setSending(true);
    setSendError(null);
    try {
      await sendWhatsAppMessage(accessToken, selectedId, { contentType: "text", text });
      await loadMessages(selectedId);
      await loadConversations();
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : "Failed to send message.";
      setSendError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-labelledby="conversation-workspace-heading"
      className="flex h-full min-h-[24rem] flex-col rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)]"
      data-testid="whatsapp-conversation-workspace"
    >
      <div className="border-b border-[var(--admin-border)] px-4 py-3">
        <h2 id="conversation-workspace-heading" className="text-sm font-semibold">
          WhatsApp conversations
        </h2>
        <p className="mt-1 text-xs text-[var(--admin-muted)]">
          Live conversation store backed by ADR-004. Select a conversation to view its message thread and compose
          outbound replies.
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-2 overflow-hidden md:grid-cols-[14rem_minmax(0,1fr)]">
        {/* Conversation list */}
        <div className="border-r border-[var(--admin-border)] overflow-y-auto">
          {loading ? (
            <div className="px-3 py-4 text-xs text-[var(--admin-muted)]">Loading…</div>
          ) : error ? (
            <div className="px-3 py-4 text-xs text-red-600">{error}</div>
          ) : conversations.length === 0 ? (
            <div className="px-3 py-4 text-xs text-[var(--admin-muted)]">
              No conversations yet. Inbound WhatsApp messages will appear here.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--admin-border)]">
              {conversations.map((conv) => (
                <li key={conv.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(conv.id)}
                    className={`w-full px-3 py-2 text-left text-xs hover:bg-[var(--admin-soft)] ${
                      selectedId === conv.id ? "bg-[var(--admin-soft)]" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[var(--admin-ink)]">
                        {conv.contactPhone.slice(-4).padStart(4, "•")}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 truncate text-[var(--admin-muted)]">
                      {conv.lastMessagePreview ?? "(no messages yet)"}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-wide text-[var(--admin-muted)]">
                      {conv.status}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Message thread */}
        <div className="flex flex-col overflow-hidden">
          {selectedId ? (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {messages.length === 0 ? (
                  <p className="text-xs text-[var(--admin-muted)]">No messages in this conversation.</p>
                ) : (
                  <ul className="space-y-2">
                    {messages.map((m) => (
                      <li
                        key={m.id}
                        className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                            m.direction === "outbound"
                              ? "bg-emerald-100 text-emerald-950"
                              : "bg-[var(--admin-soft)] text-[var(--admin-ink)]"
                          }`}
                        >
                          <div>{m.content ?? `[${m.contentType}]`}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide opacity-70">
                            {m.deliveryStatus}
                            {m.failureReason ? ` · ${m.failureReason}` : ""}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <MessageComposer
                onSend={handleSend}
                disabled={sending}
                error={sendError}
              />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-4 py-8 text-center text-sm text-[var(--admin-muted)]">
              <div>
                <p className="font-semibold text-[var(--admin-ink)]">Select a conversation</p>
                <p className="mt-2">
                  Choose a conversation from the list to view its message thread and compose a reply.
                </p>
                {hasOrderSelection && (
                  <p className="mt-2 text-xs">
                    A WhatsApp-attributed order is selected — review linked order details beside this panel.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
