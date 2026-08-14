import { useState } from "react";

export function MessageComposer({
  onSend,
  disabled,
  error,
}: {
  onSend: (text: string) => void | Promise<void>;
  disabled?: boolean;
  error?: string | null;
}) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    void onSend(trimmed);
    setText("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-[var(--admin-border)] bg-[var(--admin-soft)] p-3"
      aria-labelledby="whatsapp-message-composer-label"
    >
      <label
        id="whatsapp-message-composer-label"
        htmlFor="whatsapp-message-composer"
        className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]"
      >
        Reply via WhatsApp · outbound message
      </label>
      <textarea
        id="whatsapp-message-composer"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Type a reply and press Send. The outbox worker will deliver via the WhatsApp provider adapter (mock in dev)."
        className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-white px-3 py-2 text-sm text-[var(--admin-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-red)]"
        aria-describedby="whatsapp-composer-help"
        maxLength={4096}
        disabled={disabled}
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <p id="whatsapp-composer-help" className="text-xs text-[var(--admin-muted)]">
          {text.length}/4096 characters. Message is queued with delivery_status=pending; the outbox worker delivers it
          within ~15s and updates the status to sent/delivered/failed via webhook callbacks.
        </p>
        <button
          type="submit"
          disabled={disabled || text.trim().length === 0}
          className="min-h-11 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-[var(--admin-muted)]"
        >
          {disabled ? "Sending…" : "Send message"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {error}
        </p>
      )}
    </form>
  );
}
