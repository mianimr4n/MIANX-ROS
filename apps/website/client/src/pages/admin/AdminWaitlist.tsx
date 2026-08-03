/**
 * D3 — Waitlist Workspace.
 *
 * Ordered branch queue with quoted/elapsed wait, notify → arrive → seat flow,
 * and cancel/left transitions. Seating is atomic and server-authoritative.
 */
import { useEffect, useMemo, useState } from "react";

import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import {
  OperationsDeferredNote,
  OperationsWorkspaceHeader,
} from "@/components/admin/operations/OperationsWorkspaceHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { ApiRequestError } from "@/lib/api";
import {
  canAccessTableService,
  canManageReservations,
  canSeatGuests,
} from "@/lib/admin-access";
import { useOperationalData } from "@/lib/op-status";
import {
  addWaitlistEntry,
  getFloorConfiguration,
  listWaitlist,
  seatWaitlistEntry,
  transitionWaitlistEntry,
  updateWaitlistEntry,
  type WaitlistRecord,
  type WaitlistStatus,
} from "@/lib/table-service-api";
import { AdminShell } from "./AdminShell";

const STATUS_BADGES: Record<WaitlistStatus, string> = {
  waiting: "bg-amber-100 text-amber-900 border-amber-300",
  notified: "bg-sky-100 text-sky-900 border-sky-300",
  arrived: "bg-indigo-100 text-indigo-900 border-indigo-300",
  seated: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-red-50 text-red-800 border-red-200",
  left: "bg-neutral-100 text-neutral-700 border-neutral-300",
  expired: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

const ACTIVE_STATUSES: WaitlistStatus[] = ["waiting", "notified", "arrived"];

function errText(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

function elapsedLabel(fromIso: string, nowMs: number): string {
  const minutes = Math.max(0, Math.floor((nowMs - new Date(fromIso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function AdminWaitlist() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();

  const principal = { roles, permissions, isSuperAdmin };
  const allowed = canAccessTableService(principal);
  const { gateReady } = useAdminAccessGate(allowed);
  const canManage = canManageReservations(principal);
  const canSeat = canSeatGuests(principal);

  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const handle = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(handle);
  }, []);

  const waitlistOp = useOperationalData(
    ({ signal, correlationId }) =>
      listWaitlist(token!, { branchId: branchId!, limit: 100 }, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady,
      isEmpty: (data) => data.length === 0,
      pollMs: 20_000,
    },
  );

  const configOp = useOperationalData(
    ({ signal, correlationId }) => getFloorConfiguration(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    { enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady },
  );
  const tables = configOp.data?.tables ?? [];

  const [addForm, setAddForm] = useState({
    guestName: "",
    guestPhone: "",
    partySize: "2",
    quotedWaitMinutes: "15",
    notes: "",
  });
  const [addBusy, setAddBusy] = useState(false);

  const [seatTargetId, setSeatTargetId] = useState<string | null>(null);
  const [seatTableIds, setSeatTableIds] = useState<string[]>([]);
  const [seatResult, setSeatResult] = useState<string | null>(null);

  async function act(id: string, action: () => Promise<unknown>) {
    setActionError(null);
    setBusyId(id);
    try {
      await action();
      waitlistOp.retry();
      return true;
    } catch (err) {
      setActionError(errText(err));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function submitAdd() {
    if (!token || !branchId || !addForm.guestName.trim()) return;
    setAddBusy(true);
    setActionError(null);
    try {
      await addWaitlistEntry(token, {
        branchId,
        guestName: addForm.guestName.trim(),
        guestPhone: addForm.guestPhone.trim() || undefined,
        partySize: Number(addForm.partySize) || 1,
        quotedWaitMinutes: Number(addForm.quotedWaitMinutes) || undefined,
        notes: addForm.notes.trim() || undefined,
      });
      setAddForm({ guestName: "", guestPhone: "", partySize: "2", quotedWaitMinutes: "15", notes: "" });
      waitlistOp.retry();
    } catch (err) {
      setActionError(errText(err));
    } finally {
      setAddBusy(false);
    }
  }

  const entries = waitlistOp.data ?? [];
  const queue = useMemo(
    () =>
      entries
        .filter((e) => ACTIVE_STATUSES.includes(e.status))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [entries],
  );
  const closed = useMemo(
    () => entries.filter((e) => !ACTIVE_STATUSES.includes(e.status)),
    [entries],
  );

  if (!gateReady) return null;

  return (
    <AdminShell title="Waitlist">
      <div className="space-y-6">
        <OperationsWorkspaceHeader
          className="mb-0"
          eyebrow="Table service"
          title="Waitlist"
          description="Walk-in queue in arrival order. Distinct from reservations. Seating creates a dining session atomically."
          branchLabel={branchLabel}
          maturity="FOUNDATION"
          primaryTask="Notify and seat waiting parties"
        />

        <OperationsDeferredNote
          summary="Deferred waitlist capabilities"
          items={["SMS/provider notify beyond current transitions", "Predicted wait-time engine"]}
        />

        {!branchId ? (
          <p className="rounded-xl border bg-muted/40 p-4 text-sm">
            Select a specific branch to manage the waitlist.
          </p>
        ) : null}

        <OperationalStatusBanner
          state={waitlistOp.state}
          error={waitlistOp.error}
          lastSuccessAt={waitlistOp.lastSuccessAt}
          onRetry={waitlistOp.retry}
          correlationId={waitlistOp.correlationId}
          showTechnicalDetail={isSuperAdmin}
        />
        {actionError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {actionError}
          </p>
        ) : null}
        {seatResult ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {seatResult}
          </p>
        ) : null}

        {canManage ? (
          <form
            className="grid gap-3 rounded-xl border p-4 md:grid-cols-5"
            onSubmit={(e) => {
              e.preventDefault();
              void submitAdd();
            }}
          >
            <label className="flex flex-col gap-1 text-xs">
              Guest name *
              <input
                className="rounded-md border px-2 py-1.5 text-sm"
                value={addForm.guestName}
                onChange={(e) => setAddForm({ ...addForm, guestName: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Phone
              <input
                className="rounded-md border px-2 py-1.5 text-sm"
                value={addForm.guestPhone}
                onChange={(e) => setAddForm({ ...addForm, guestPhone: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Party size *
              <input
                type="number"
                min={1}
                className="rounded-md border px-2 py-1.5 text-sm"
                value={addForm.partySize}
                onChange={(e) => setAddForm({ ...addForm, partySize: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs">
              Quoted wait (min)
              <input
                type="number"
                min={0}
                className="rounded-md border px-2 py-1.5 text-sm"
                value={addForm.quotedWaitMinutes}
                onChange={(e) => setAddForm({ ...addForm, quotedWaitMinutes: e.target.value })}
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={addBusy || !addForm.guestName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {addBusy ? "Adding…" : "Add to waitlist"}
              </button>
            </div>
          </form>
        ) : null}

        <section className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              Queue (
              {waitlistOp.state === "ERROR" || waitlistOp.state === "OFFLINE"
                ? "unavailable"
                : `${queue.length} waiting`}
              )
            </h2>
          </div>
          {waitlistOp.state === "LOADING" ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Loading waitlist…</p>
          ) : waitlistOp.state === "ERROR" || waitlistOp.state === "OFFLINE" ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Waitlist is unavailable until the request succeeds. Use Retry above.
            </p>
          ) : queue.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">EMPTY — nobody is waiting.</p>
          ) : (
            <div className="divide-y">
              {queue.map((entry, index) => {
                const busy = busyId === entry.id;
                return (
                  <div key={entry.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="w-6 text-center font-mono text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="font-semibold">{entry.guestName}</span>
                      <span className="text-muted-foreground">party of {entry.partySize}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[entry.status]}`}
                      >
                        {entry.status}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        waiting {elapsedLabel(entry.createdAt, nowMs)}
                        {entry.quotedWaitMinutes != null ? ` · quoted ${entry.quotedWaitMinutes}m` : ""}
                      </span>
                      {entry.guestPhone ? (
                        <span className="text-xs text-muted-foreground">{entry.guestPhone}</span>
                      ) : null}
                    </div>
                    {entry.notes ? <p className="text-xs text-muted-foreground">{entry.notes}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      {canManage && entry.status === "waiting" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(entry.id, () => transitionWaitlistEntry(token!, entry.id, "notify"))}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          Notify
                        </button>
                      ) : null}
                      {canManage && (entry.status === "waiting" || entry.status === "notified") ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(entry.id, () => transitionWaitlistEntry(token!, entry.id, "arrive"))}
                          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                        >
                          Mark arrived
                        </button>
                      ) : null}
                      {canSeat ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            setSeatTargetId(seatTargetId === entry.id ? null : entry.id);
                            setSeatTableIds([]);
                          }}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                        >
                          {seatTargetId === entry.id ? "Close seating" : "Seat"}
                        </button>
                      ) : null}
                      {canManage ? (
                        <>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void act(entry.id, () => transitionWaitlistEntry(token!, entry.id, "cancel"))}
                            className="rounded-md border px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void act(entry.id, () => transitionWaitlistEntry(token!, entry.id, "left"))}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Left
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              const next = window.prompt(
                                "New quoted wait in minutes:",
                                String(entry.quotedWaitMinutes ?? 15),
                              );
                              if (next == null) return;
                              const minutes = Number(next);
                              if (!Number.isFinite(minutes) || minutes < 0) return;
                              void act(entry.id, () =>
                                updateWaitlistEntry(token!, entry.id, { quotedWaitMinutes: minutes }),
                              );
                            }}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Update estimate
                          </button>
                        </>
                      ) : null}
                    </div>

                    {seatTargetId === entry.id ? (
                      <div className="rounded-lg border bg-muted/20 p-3">
                        <p className="mb-2 text-xs text-muted-foreground">
                          Pick one or more available tables for a party of {entry.partySize}.
                        </p>
                        <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
                          {tables
                            .filter((t) => t.isActive)
                            .map((t) => {
                              const checked = seatTableIds.includes(t.id);
                              return (
                                <label
                                  key={t.id}
                                  className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs ${
                                    checked ? "border-primary bg-primary/10" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) =>
                                      setSeatTableIds(
                                        e.target.checked
                                          ? [...seatTableIds, t.id]
                                          : seatTableIds.filter((id) => id !== t.id),
                                      )
                                    }
                                  />
                                  T{t.tableNumber} ({t.capacityMin}
                                  {t.capacityMax != null ? `–${t.capacityMax}` : "+"}) · {t.operationalStatus}
                                </label>
                              );
                            })}
                        </div>
                        <button
                          type="button"
                          disabled={busy || seatTableIds.length === 0}
                          onClick={() =>
                            void act(entry.id, async () => {
                              const result = await seatWaitlistEntry(token!, entry.id, {
                                tableIds: seatTableIds,
                              });
                              setSeatResult(
                                `${entry.guestName} seated — session ${result.sessionNumber}.`,
                              );
                              setSeatTargetId(null);
                            })
                          }
                          className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                        >
                          Seat party
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-xl border">
          <button
            type="button"
            onClick={() => setShowClosed((v) => !v)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
          >
            Resolved today (
            {waitlistOp.state === "ERROR" || waitlistOp.state === "OFFLINE" ? "unavailable" : closed.length})
            <span className="text-xs text-muted-foreground">{showClosed ? "Hide" : "Show"}</span>
          </button>
          {showClosed ? (
            waitlistOp.state === "ERROR" || waitlistOp.state === "OFFLINE" ? (
              <p className="border-t px-4 py-3 text-sm text-muted-foreground">
                Resolved history unavailable while waitlist data could not be loaded.
              </p>
            ) : closed.length === 0 ? (
              <p className="border-t px-4 py-3 text-sm text-muted-foreground">EMPTY.</p>
            ) : (
              <div className="divide-y border-t">
                {closed.map((entry) => (
                  <div key={entry.id} className="flex flex-wrap items-center gap-2 px-4 py-2 text-sm">
                    <span className="font-medium">{entry.guestName}</span>
                    <span className="text-muted-foreground">party of {entry.partySize}</span>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[entry.status]}`}
                    >
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </section>
      </div>
    </AdminShell>
  );
}
