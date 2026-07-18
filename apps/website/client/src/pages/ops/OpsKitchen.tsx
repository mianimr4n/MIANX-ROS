import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError } from "@/lib/api";
import { listKitchenTickets, patchKitchenTicketStatus, type KitchenTicket } from "@/lib/ops-api";
import { OpsShell } from "./OpsShell";

const COLUMNS: Array<{ status: string; title: string }> = [
  { status: "queued", title: "Queued" },
  { status: "accepted", title: "Accepted" },
  { status: "preparing", title: "Preparing" },
  { status: "ready", title: "Ready" },
];

const NEXT: Record<string, string | undefined> = {
  queued: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
};

function elapsed(iso: string | null | undefined, fallback: string): string {
  const start = iso ? new Date(iso).getTime() : new Date(fallback).getTime();
  const mins = Math.max(0, Math.floor((Date.now() - start) / 60000));
  return `${mins}m`;
}

export default function OpsKitchen() {
  const { session } = useAuth();
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const token = session?.access_token;

  const refresh = useCallback(async () => {
    if (!token) return;
    try {
      const data = await listKitchenTickets(token, { limit: 80 });
      setTickets(data.filter((t) => t.status !== "completed" && t.status !== "cancelled"));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to load kitchen queue");
    }
  }, [token]);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), 7000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const byStatus = useMemo(() => {
    const map: Record<string, KitchenTicket[]> = {};
    for (const col of COLUMNS) map[col.status] = [];
    for (const ticket of tickets) {
      (map[ticket.status] ??= []).push(ticket);
    }
    return map;
  }, [tickets]);

  async function advance(ticket: KitchenTicket) {
    if (!token) return;
    const next = NEXT[ticket.status];
    if (!next) return;
    try {
      await patchKitchenTicketStatus(token, ticket.id, next);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Status update failed");
    }
  }

  const content = (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Kitchen display</h1>
          <p className="text-zinc-400">Active tickets only · high contrast · 7s refresh</p>
        </div>
        <button
          type="button"
          onClick={() => setFullscreen((v) => !v)}
          className="rounded-lg bg-zinc-800 px-4 py-3 font-semibold hover:bg-zinc-700"
        >
          {fullscreen ? "Exit full screen" : "Full-screen kitchen mode"}
        </button>
      </div>
      {error ? <p className="mb-4 rounded-lg bg-red-950 text-red-200 px-4 py-3">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <section key={col.status} className="rounded-2xl border border-zinc-700 bg-black p-3">
            <h2 className="mb-3 text-xl font-bold uppercase tracking-wide text-amber-300">
              {col.title} ({byStatus[col.status]?.length ?? 0})
            </h2>
            <div className="space-y-3">
              {(byStatus[col.status] ?? []).map((ticket) => (
                <article
                  key={ticket.id}
                  className={`rounded-xl border p-3 ${
                    ticket.priority > 0 ? "border-amber-400 bg-zinc-900" : "border-zinc-700 bg-zinc-950"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-lg font-bold">#{ticket.sequenceNumber ?? "—"}</span>
                    <span className="text-amber-300 font-semibold">
                      {elapsed(ticket.startedAt ?? ticket.acceptedAt, ticket.createdAt)}
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {ticket.items.map((item) => (
                      <li key={item.id}>
                        {item.quantity}× {item.itemNameSnapshot}
                      </li>
                    ))}
                  </ul>
                  {NEXT[ticket.status] ? (
                    <button
                      type="button"
                      onClick={() => void advance(ticket)}
                      className="mt-3 w-full min-h-12 rounded-xl bg-red-600 text-base font-bold hover:bg-red-500"
                    >
                      → {NEXT[ticket.status]}
                    </button>
                  ) : null}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );

  if (fullscreen) {
    return <div className="min-h-screen bg-black text-zinc-50 p-4">{content}</div>;
  }

  return <OpsShell>{content}</OpsShell>;
}
