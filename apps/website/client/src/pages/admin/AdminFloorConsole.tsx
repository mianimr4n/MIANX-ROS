/**
 * D3 — Live Floor Console.
 *
 * Real-time (polled) branch floor view: table status with text labels, active
 * dining sessions, elapsed dining time, assigned server, upcoming reservation
 * alerts, conflicts, and direct operational actions (seat walk-in, request
 * bill, close session, mark cleaned). All actions hit the real API.
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
import { canAccessTableService, canSeatGuests } from "@/lib/admin-access";
import { formatLastSuccess, useOperationalData } from "@/lib/op-status";
import {
  TABLE_STATUS_CLASSES,
  TABLE_STATUS_LABELS,
  closeDiningSession,
  getLiveFloorState,
  requestSessionBill,
  seatWalkIn,
  transitionTableStatus,
  type TableOperationalStatus,
} from "@/lib/table-service-api";
import { AdminShell } from "./AdminShell";

type LiveSession = {
  id: string;
  sessionNumber: string | null;
  guestName: string | null;
  partySize: number | null;
  serviceStatus: string;
  openedAt: string;
  seatedAt: string | null;
  billRequestedAt: string | null;
  primaryServerUserId: string | null;
  primaryServerName: string | null;
};

type LiveTableRow = {
  id: string;
  floor_id: string | null;
  service_area_id: string | null;
  table_number: string;
  display_name: string | null;
  capacity_min: number | null;
  capacity_max: number | null;
  is_active: boolean;
  operational_status: TableOperationalStatus;
  session: LiveSession | null;
};

type UpcomingReservation = {
  id: string;
  reservation_number: string;
  guest_name: string;
  party_size: number;
  start_at: string;
  reservation_status: string;
  assigned_table_id: string | null;
};

function errText(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

function elapsedLabel(fromIso: string | null, nowMs: number): string | null {
  if (!fromIso) return null;
  const minutes = Math.max(0, Math.floor((nowMs - new Date(fromIso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminFloorConsole() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();

  const principal = { roles, permissions, isSuperAdmin };
  const allowed = canAccessTableService(principal);
  const { gateReady } = useAdminAccessGate(allowed);
  const canOperate = canSeatGuests(principal);

  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;

  const [actionError, setActionError] = useState<string | null>(null);
  const [busyTableId, setBusyTableId] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  useEffect(() => {
    const handle = setInterval(() => setNowMs(Date.now()), 30_000);
    return () => clearInterval(handle);
  }, []);

  const floorOp = useOperationalData(
    ({ signal, correlationId }) => getLiveFloorState(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady,
      pollMs: 12_000,
      isEmpty: (data) => (data.tables?.length ?? 0) === 0,
    },
  );

  const state = floorOp.data;
  const tables = (state?.tables ?? []) as unknown as LiveTableRow[];
  const floors = (state?.floors ?? []) as { id: string; code: string; display_name: string }[];
  const areas = (state?.areas ?? []) as { id: string; floor_id: string; display_name: string }[];
  const upcoming = (state?.upcomingReservations ?? []) as unknown as UpcomingReservation[];
  const conflicts = state?.conflicts ?? [];

  const [floorFilter, setFloorFilter] = useState<string>("");
  const visibleTables = useMemo(
    () => tables.filter((t) => !floorFilter || t.floor_id === floorFilter || t.floor_id === null),
    [tables, floorFilter],
  );

  const selectedTable = tables.find((t) => t.id === selectedTableId) ?? null;

  // Walk-in seating form
  const [walkInForm, setWalkInForm] = useState({ guestName: "", partySize: "2" });
  const [walkInBusy, setWalkInBusy] = useState(false);
  const [walkInResult, setWalkInResult] = useState<string | null>(null);

  async function act(tableId: string, action: () => Promise<unknown>) {
    setActionError(null);
    setBusyTableId(tableId);
    try {
      await action();
      floorOp.retry();
      return true;
    } catch (err) {
      setActionError(errText(err));
      return false;
    } finally {
      setBusyTableId(null);
    }
  }

  async function submitWalkIn() {
    if (!token || !branchId || !selectedTable || !walkInForm.guestName.trim()) return;
    setWalkInBusy(true);
    setActionError(null);
    try {
      const result = await seatWalkIn(token, {
        branchId,
        tableIds: [selectedTable.id],
        partySize: Number(walkInForm.partySize) || 1,
        guestName: walkInForm.guestName.trim(),
      });
      setWalkInResult(`Walk-in seated — session ${result.sessionNumber} at table ${selectedTable.table_number}.`);
      setWalkInForm({ guestName: "", partySize: "2" });
      setSelectedTableId(null);
      floorOp.retry();
    } catch (err) {
      setActionError(errText(err));
    } finally {
      setWalkInBusy(false);
    }
  }

  const statusCounts = useMemo(() => {
    const counts = new Map<TableOperationalStatus, number>();
    for (const t of tables) counts.set(t.operational_status, (counts.get(t.operational_status) ?? 0) + 1);
    return counts;
  }, [tables]);

  if (!gateReady) return null;

  return (
    <AdminShell title="Live floor">
      <div className="space-y-6">
        <OperationsWorkspaceHeader
          className="mb-0"
          eyebrow="Table service"
          title="Live floor"
          description="Table occupancy and dining-session actions for the active branch. Not a full floor-management suite."
          branchLabel={branchLabel}
          maturity="FOUNDATION"
          primaryTask="Monitor tables and seat or close sessions"
          liveLabel={
            state
              ? `Updated ${formatLastSuccess(floorOp.lastSuccessAt) ?? "—"} · ${state.waitlistCount} waiting`
              : undefined
          }
          actions={
            floors.length > 1 ? (
              <select
                aria-label="Floor filter"
                className="min-h-11 rounded-md border px-2 py-1.5 text-sm"
                value={floorFilter}
                onChange={(e) => setFloorFilter(e.target.value)}
              >
                <option value="">All floors</option>
                {floors.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.display_name}
                  </option>
                ))}
              </select>
            ) : null
          }
        />

        <OperationsDeferredNote
          summary="Deferred live-floor capabilities"
          items={[
            "Real-time seating intelligence beyond polled table state",
            "Host stand hardware / layout designer in this console",
            "Cross-branch floor analytics",
          ]}
        />

        {floors.length === 0 || tables.filter((t) => t.is_active).length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">SETUP REQUIRED</p>
            <p>
              <span className="font-medium">Problem:</span> No active floor or tables configured for{" "}
              {branchLabel}.
            </p>
            <p>
              <span className="font-medium">Next action:</span> Create the first floor and at least one
              active table on{" "}
              <a className="underline" href="/admin/floor-plan">
                Floor plan
              </a>
              .
            </p>
          </div>
        ) : null}

        {!branchId ? (
          <p className="rounded-xl border bg-muted/40 p-4 text-sm">
            Select a specific branch to view its live floor.
          </p>
        ) : null}

        <OperationalStatusBanner
          state={floorOp.state}
          error={floorOp.error}
          lastSuccessAt={floorOp.lastSuccessAt}
          onRetry={floorOp.retry}
          correlationId={floorOp.correlationId}
          showTechnicalDetail={isSuperAdmin}
        />
        {actionError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {actionError}
          </p>
        ) : null}
        {walkInResult ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {walkInResult}
          </p>
        ) : null}

        {/* Alerts */}
        {conflicts.length > 0 ? (
          <div className="space-y-1 rounded-xl border border-red-300 bg-red-50 px-4 py-3">
            <p className="text-sm font-semibold text-red-900">Seating conflicts</p>
            {conflicts.map((c) => (
              <p key={`${c.tableId}-${c.reason}`} className="text-xs text-red-900">
                {c.reason}
              </p>
            ))}
          </div>
        ) : null}
        {upcoming.length > 0 ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
            <p className="text-sm font-semibold text-sky-900">Upcoming reservations (next 2 hours)</p>
            <div className="mt-1 flex flex-wrap gap-3">
              {upcoming.slice(0, 8).map((r) => (
                <span key={r.id} className="text-xs text-sky-900">
                  {timeLabel(r.start_at)} · {r.guest_name} ({r.party_size}) — {r.reservation_number}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {/* Status legend with live counts */}
        <div className="flex flex-wrap gap-2">
          {(Object.keys(TABLE_STATUS_LABELS) as TableOperationalStatus[]).map((s) => (
            <span key={s} className={`rounded-md border px-2 py-0.5 text-xs font-medium ${TABLE_STATUS_CLASSES[s]}`}>
              {TABLE_STATUS_LABELS[s]}: {statusCounts.get(s) ?? 0}
            </span>
          ))}
        </div>

        {floorOp.state === "LOADING" ? (
          <p className="text-sm text-muted-foreground">Loading live floor…</p>
        ) : visibleTables.length === 0 ? (
          <p className="rounded-xl border px-4 py-3 text-sm text-muted-foreground">
            EMPTY — no tables configured for this branch yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {visibleTables.map((t) => {
              const area = areas.find((a) => a.id === t.service_area_id);
              const dining = elapsedLabel(t.session?.seatedAt ?? t.session?.openedAt ?? null, nowMs);
              const busy = busyTableId === t.id;
              const isSelected = selectedTableId === t.id;
              return (
                <div
                  key={t.id}
                  className={`rounded-xl border-2 p-3 text-left ${TABLE_STATUS_CLASSES[t.operational_status]} ${
                    isSelected ? "ring-2 ring-primary" : ""
                  } ${t.is_active ? "" : "opacity-50"}`}
                >
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => setSelectedTableId(isSelected ? null : t.id)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">Table {t.table_number}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide">
                        {TABLE_STATUS_LABELS[t.operational_status]}
                      </span>
                    </div>
                    <p className="text-xs opacity-80">
                      Seats {t.capacity_min ?? 1}
                      {t.capacity_max != null ? `–${t.capacity_max}` : "+"}
                      {area ? ` · ${area.display_name}` : ""}
                    </p>
                    {t.session ? (
                      <div className="mt-1 space-y-0.5 text-xs">
                        <p className="font-medium">
                          {t.session.guestName ?? "Guest"} · party of {t.session.partySize ?? "?"}
                        </p>
                        <p className="opacity-80">
                          {dining ? `dining ${dining}` : null}
                          {t.session.primaryServerName ? ` · ${t.session.primaryServerName}` : ""}
                        </p>
                        <p className="font-mono text-[10px] opacity-70">{t.session.sessionNumber}</p>
                      </div>
                    ) : null}
                  </button>

                  {isSelected && canOperate ? (
                    <div className="mt-2 space-y-2 border-t border-current/20 pt-2">
                      {t.session ? (
                        <div className="flex flex-wrap gap-1.5">
                          {t.session.serviceStatus !== "bill_requested" &&
                          t.session.serviceStatus !== "payment_pending" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void act(t.id, () => requestSessionBill(token!, t.session!.id))}
                              className="rounded-md border border-current/40 bg-white/70 px-2 py-1 text-xs font-semibold disabled:opacity-50"
                            >
                              Request bill
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                              if (!window.confirm(`Close session ${t.session!.sessionNumber ?? ""}?`)) return;
                              void act(t.id, () =>
                                closeDiningSession(token!, t.session!.id, { overrideOpenBill: true }),
                              );
                            }}
                            className="rounded-md border border-current/40 bg-white/70 px-2 py-1 text-xs font-semibold disabled:opacity-50"
                          >
                            Close session
                          </button>
                        </div>
                      ) : t.operational_status === "available" && t.is_active ? (
                        <form
                          className="space-y-1.5"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void submitWalkIn();
                          }}
                        >
                          <input
                            aria-label="Guest name"
                            className="w-full rounded-md border border-current/40 bg-white/80 px-2 py-1 text-xs"
                            placeholder="Guest name"
                            value={walkInForm.guestName}
                            onChange={(e) => setWalkInForm({ ...walkInForm, guestName: e.target.value })}
                          />
                          <div className="flex gap-1.5">
                            <input
                              aria-label="Party size"
                              type="number"
                              min={1}
                              className="w-16 rounded-md border border-current/40 bg-white/80 px-2 py-1 text-xs"
                              value={walkInForm.partySize}
                              onChange={(e) => setWalkInForm({ ...walkInForm, partySize: e.target.value })}
                            />
                            <button
                              type="submit"
                              disabled={walkInBusy || !walkInForm.guestName.trim()}
                              className="rounded-md border border-current/40 bg-white/70 px-2 py-1 text-xs font-semibold disabled:opacity-50"
                            >
                              Seat walk-in
                            </button>
                          </div>
                        </form>
                      ) : t.operational_status === "cleaning" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void act(t.id, () => transitionTableStatus(token!, t.id, "available"))}
                          className="rounded-md border border-current/40 bg-white/70 px-2 py-1 text-xs font-semibold disabled:opacity-50"
                        >
                          Mark cleaned
                        </button>
                      ) : (
                        <p className="text-[11px] opacity-70">No direct action for this status.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
