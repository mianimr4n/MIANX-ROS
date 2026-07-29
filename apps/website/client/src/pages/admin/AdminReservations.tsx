/**
 * D3 — Reservation Workspace.
 *
 * Branch-scoped day view of reservations with availability search, creation
 * (idempotent), lifecycle transitions, table assignment, and seating. All
 * availability and conflict decisions are server-authoritative.
 */
import { useMemo, useState } from "react";

import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
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
  createReservation,
  getFloorConfiguration,
  getReservationDailyReport,
  listReservations,
  assignReservationTables,
  searchReservationAvailability,
  seatReservation,
  transitionReservation,
  type AvailabilitySlot,
  type ReservationRecord,
  type ReservationStatus,
} from "@/lib/table-service-api";
import { BookingPolicyPanel } from "@/components/admin/reservations/BookingPolicyPanel";
import { AdminShell } from "./AdminShell";

const STATUS_BADGES: Record<ReservationStatus, string> = {
  inquiry: "bg-slate-100 text-slate-800 border-slate-300",
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-sky-100 text-sky-900 border-sky-300",
  arrived: "bg-indigo-100 text-indigo-900 border-indigo-300",
  partially_seated: "bg-violet-100 text-violet-900 border-violet-300",
  seated: "bg-emerald-100 text-emerald-900 border-emerald-300",
  completed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-50 text-red-800 border-red-200",
  no_show: "bg-red-100 text-red-900 border-red-300",
  declined: "bg-neutral-100 text-neutral-700 border-neutral-300",
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function timeLabel(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function errText(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `res-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export default function AdminReservations() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();

  const principal = { roles, permissions, isSuperAdmin };
  const allowed = canAccessTableService(principal);
  const { gateReady } = useAdminAccessGate(allowed);
  const canManage = canManageReservations(principal);
  const canSeat = canSeatGuests(principal);

  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;

  const [date, setDate] = useState(todayIso());
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "">("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const reservationsOp = useOperationalData(
    ({ signal, correlationId }) =>
      listReservations(
        token!,
        { branchId: branchId!, date, status: statusFilter || undefined, limit: 100 },
        { signal, correlationId },
      ),
    [token, branchId, date, statusFilter],
    {
      enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady,
      isEmpty: (data) => data.length === 0,
      pollMs: 30_000,
    },
  );

  const reportOp = useOperationalData(
    ({ signal, correlationId }) =>
      getReservationDailyReport(token!, branchId!, date, { signal, correlationId }),
    [token, branchId, date],
    { enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady },
  );

  // Table catalogue for assignment/seating pickers.
  const configOp = useOperationalData(
    ({ signal, correlationId }) => getFloorConfiguration(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    { enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady },
  );
  const tables = configOp.data?.tables ?? [];

  // ---- create form + availability search
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    guestName: "",
    guestPhone: "",
    partySize: "2",
    time: "19:00",
    durationMinutes: "90",
    specialRequests: "",
    accessibilityRequired: false,
    highChairCount: "0",
  });
  const [slots, setSlots] = useState<AvailabilitySlot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [createResult, setCreateResult] = useState<string | null>(null);

  async function searchSlots() {
    if (!token || !branchId) return;
    setSlots(null);
    setSlotsError(null);
    setSlotsLoading(true);
    try {
      const result = await searchReservationAvailability(token, {
        branchId,
        date,
        partySize: Number(createForm.partySize) || 2,
        durationMinutes: Number(createForm.durationMinutes) || undefined,
      });
      setSlots(result.slots);
    } catch (err) {
      setSlotsError(errText(err));
    } finally {
      setSlotsLoading(false);
    }
  }

  async function submitCreate() {
    if (!token || !branchId || !createForm.guestName.trim()) return;
    setCreateBusy(true);
    setActionError(null);
    setCreateResult(null);
    try {
      const startAt = new Date(`${date}T${createForm.time}:00+05:00`).toISOString();
      const created = await createReservation(
        token,
        {
          branchId,
          guestName: createForm.guestName.trim(),
          guestPhone: createForm.guestPhone.trim() || undefined,
          startAt,
          partySize: Number(createForm.partySize) || 2,
          highChairCount: Number(createForm.highChairCount) || 0,
          accessibilityRequired: createForm.accessibilityRequired,
          bookingChannel: "admin",
          reservationStatus: "pending",
          specialRequests: createForm.specialRequests.trim() || undefined,
        },
        newIdempotencyKey(),
      );
      setCreateResult(`Reservation ${created.reservationNumber} created (${created.status}).`);
      setCreateForm({ ...createForm, guestName: "", guestPhone: "", specialRequests: "" });
      setSlots(null);
      reservationsOp.retry();
      reportOp.retry();
    } catch (err) {
      setActionError(errText(err));
    } finally {
      setCreateBusy(false);
    }
  }

  // ---- per-reservation actions
  const [seatTarget, setSeatTarget] = useState<ReservationRecord | null>(null);
  const [seatTableIds, setSeatTableIds] = useState<string[]>([]);
  const [assignTarget, setAssignTarget] = useState<ReservationRecord | null>(null);
  const [assignTableIds, setAssignTableIds] = useState<string[]>([]);

  async function act(id: string, action: () => Promise<unknown>) {
    setActionError(null);
    setBusyId(id);
    try {
      await action();
      reservationsOp.retry();
      reportOp.retry();
      return true;
    } catch (err) {
      setActionError(errText(err));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  const rows = useMemo(
    () =>
      [...(reservationsOp.data ?? [])].sort(
        (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
      ),
    [reservationsOp.data],
  );
  const report = reportOp.data;

  if (!gateReady) return null;

  return (
    <AdminShell title="Reservations">
      <div className="space-y-6">
        <BookingPolicyPanel />
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Reservations — {branchLabel}</h2>
            <p className="text-sm text-muted-foreground">
              Day view. Availability, conflicts, and double-booking protection are enforced by the
              server.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm">
              Date
              <input
                type="date"
                className="rounded-md border px-2 py-1.5 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <select
              aria-label="Status filter"
              className="rounded-md border px-2 py-1.5 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ReservationStatus | "")}
            >
              <option value="">All statuses</option>
              {Object.keys(STATUS_BADGES).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </option>
              ))}
            </select>
            {canManage ? (
              <button
                type="button"
                onClick={() => setShowCreate((v) => !v)}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
              >
                {showCreate ? "Close" : "New reservation"}
              </button>
            ) : null}
          </div>
        </header>

        {!branchId ? (
          <p className="rounded-xl border bg-muted/40 p-4 text-sm">
            Select a specific branch to manage reservations.
          </p>
        ) : null}

        <OperationalStatusBanner
          state={reservationsOp.state}
          error={reservationsOp.error}
          lastSuccessAt={reservationsOp.lastSuccessAt}
          onRetry={reservationsOp.retry}
          correlationId={reservationsOp.correlationId}
          showTechnicalDetail={isSuperAdmin}
        />
        {actionError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {actionError}
          </p>
        ) : null}
        {createResult ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {createResult}
          </p>
        ) : null}

        {/* Daily summary — only real stored data */}
        {report ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["Reservations", report.totalReservations],
                ["Covers booked", report.covers],
                ["Seated covers", report.seatedCovers],
                ["No-shows", report.noShows],
                ["Cancellations", report.cancellations],
                ["Dining sessions", report.diningSessions],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="rounded-xl border p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
        ) : null}

        {/* Create + availability */}
        {showCreate && canManage ? (
          <section className="space-y-3 rounded-xl border p-4">
            <h2 className="text-sm font-semibold">New reservation — {date}</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <label className="flex flex-col gap-1 text-xs">
                Guest name *
                <input
                  className="rounded-md border px-2 py-1.5 text-sm"
                  value={createForm.guestName}
                  onChange={(e) => setCreateForm({ ...createForm, guestName: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Phone
                <input
                  className="rounded-md border px-2 py-1.5 text-sm"
                  value={createForm.guestPhone}
                  onChange={(e) => setCreateForm({ ...createForm, guestPhone: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Party size *
                <input
                  type="number"
                  min={1}
                  className="rounded-md border px-2 py-1.5 text-sm"
                  value={createForm.partySize}
                  onChange={(e) => setCreateForm({ ...createForm, partySize: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                Time *
                <input
                  type="time"
                  className="rounded-md border px-2 py-1.5 text-sm"
                  value={createForm.time}
                  onChange={(e) => setCreateForm({ ...createForm, time: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                High chairs
                <input
                  type="number"
                  min={0}
                  className="rounded-md border px-2 py-1.5 text-sm"
                  value={createForm.highChairCount}
                  onChange={(e) => setCreateForm({ ...createForm, highChairCount: e.target.value })}
                />
              </label>
              <label className="mt-5 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={createForm.accessibilityRequired}
                  onChange={(e) => setCreateForm({ ...createForm, accessibilityRequired: e.target.checked })}
                />
                Accessibility required
              </label>
              <label className="col-span-2 flex flex-col gap-1 text-xs">
                Special requests
                <input
                  className="rounded-md border px-2 py-1.5 text-sm"
                  value={createForm.specialRequests}
                  onChange={(e) => setCreateForm({ ...createForm, specialRequests: e.target.value })}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void searchSlots()}
                disabled={slotsLoading}
                className="rounded-md border px-3 py-1.5 text-sm font-semibold hover:bg-muted disabled:opacity-50"
              >
                {slotsLoading ? "Searching…" : "Check availability"}
              </button>
              <button
                type="button"
                onClick={() => void submitCreate()}
                disabled={createBusy || !createForm.guestName.trim()}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                {createBusy ? "Creating…" : "Create reservation"}
              </button>
            </div>
            {slotsError ? <p className="text-sm text-red-700">{slotsError}</p> : null}
            {slots ? (
              slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">EMPTY — no slots returned for this day.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => (
                    <button
                      key={slot.startAt}
                      type="button"
                      disabled={!slot.available}
                      onClick={() =>
                        setCreateForm({
                          ...createForm,
                          time: new Date(slot.startAt)
                            .toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              timeZone: "Asia/Karachi",
                            }),
                        })
                      }
                      title={
                        slot.available
                          ? `${slot.tableOptions.length} table option(s)`
                          : "No table fits this party at this time"
                      }
                      className={`rounded-md border px-2 py-1 text-xs ${
                        slot.available
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900 hover:bg-emerald-100"
                          : "cursor-not-allowed border-neutral-200 bg-neutral-100 text-neutral-400 line-through"
                      }`}
                    >
                      {timeLabel(slot.startAt)}
                    </button>
                  ))}
                </div>
              )
            ) : null}
          </section>
        ) : null}

        {/* Reservation list */}
        <section className="rounded-xl border">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold">
              {date} —{" "}
              {reservationsOp.state === "ERROR" || reservationsOp.state === "OFFLINE"
                ? "unavailable"
                : `${rows.length} reservation${rows.length === 1 ? "" : "s"}`}
            </h2>
          </div>
          {reservationsOp.state === "LOADING" ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Loading reservations…</p>
          ) : reservationsOp.state === "ERROR" || reservationsOp.state === "OFFLINE" ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Reservations are unavailable until the request succeeds. Use Retry above.
            </p>
          ) : rows.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">EMPTY — no reservations for this day.</p>
          ) : (
            <div className="divide-y">
              {rows.map((r) => {
                const busy = busyId === r.id;
                const canTransition = canManage && !busy;
                return (
                  <div key={r.id} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-mono text-xs text-muted-foreground">{r.reservationNumber}</span>
                      <span className="font-semibold">{timeLabel(r.startAt)}</span>
                      <span>{r.guestName}</span>
                      <span className="text-muted-foreground">party of {r.partySize}</span>
                      <span
                        className={`rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[r.reservationStatus]}`}
                      >
                        {r.reservationStatus.replace(/_/g, " ")}
                      </span>
                      {r.tableIds.length > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Tables:{" "}
                          {r.tableIds
                            .map((id) => tables.find((t) => t.id === id)?.tableNumber ?? "?")
                            .join(", ")}
                        </span>
                      ) : null}
                      {r.accessibilityRequired ? (
                        <span className="text-xs text-muted-foreground">accessible</span>
                      ) : null}
                    </div>
                    {r.specialRequests ? (
                      <p className="text-xs text-muted-foreground">Requests: {r.specialRequests}</p>
                    ) : null}
                    <div className="flex flex-wrap gap-2">
                      {r.reservationStatus === "pending" || r.reservationStatus === "inquiry" ? (
                        <>
                          <button
                            type="button"
                            disabled={!canTransition}
                            onClick={() => void act(r.id, () => transitionReservation(token!, r.id, "confirm"))}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            disabled={!canTransition}
                            onClick={() => void act(r.id, () => transitionReservation(token!, r.id, "decline"))}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Decline
                          </button>
                        </>
                      ) : null}
                      {r.reservationStatus === "confirmed" ? (
                        <>
                          <button
                            type="button"
                            disabled={!canTransition}
                            onClick={() => void act(r.id, () => transitionReservation(token!, r.id, "arrive"))}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            Mark arrived
                          </button>
                          <button
                            type="button"
                            disabled={!canTransition}
                            onClick={() => void act(r.id, () => transitionReservation(token!, r.id, "no-show"))}
                            className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                          >
                            No-show
                          </button>
                        </>
                      ) : null}
                      {["pending", "confirmed", "arrived"].includes(r.reservationStatus) ? (
                        <>
                          {canManage ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setAssignTarget(assignTarget?.id === r.id ? null : r);
                                setAssignTableIds(r.tableIds);
                              }}
                              className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                            >
                              {assignTarget?.id === r.id ? "Close tables" : "Assign tables"}
                            </button>
                          ) : null}
                          {canSeat ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                setSeatTarget(seatTarget?.id === r.id ? null : r);
                                setSeatTableIds(r.tableIds);
                              }}
                              className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 disabled:opacity-50"
                            >
                              {seatTarget?.id === r.id ? "Close seating" : "Seat"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={!canTransition}
                            onClick={() =>
                              void act(r.id, () => transitionReservation(token!, r.id, "cancel", "staff-cancelled"))
                            }
                            className="rounded-md border px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}
                    </div>

                    {assignTarget?.id === r.id ? (
                      <TablePicker
                        tables={tables}
                        selected={assignTableIds}
                        onChange={setAssignTableIds}
                        actionLabel="Save table assignment"
                        disabled={busy || assignTableIds.length === 0}
                        onSubmit={() =>
                          void act(r.id, () => assignReservationTables(token!, r.id, assignTableIds)).then(
                            (ok) => ok && setAssignTarget(null),
                          )
                        }
                      />
                    ) : null}
                    {seatTarget?.id === r.id ? (
                      <TablePicker
                        tables={tables}
                        selected={seatTableIds}
                        onChange={setSeatTableIds}
                        actionLabel="Seat party"
                        disabled={busy || seatTableIds.length === 0}
                        onSubmit={() =>
                          void act(r.id, () => seatReservation(token!, r.id, { tableIds: seatTableIds })).then(
                            (ok) => ok && setSeatTarget(null),
                          )
                        }
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}

function TablePicker({
  tables,
  selected,
  onChange,
  onSubmit,
  actionLabel,
  disabled,
}: {
  tables: { id: string; tableNumber: string; capacityMin: number; capacityMax: number | null; operationalStatus: string; isActive: boolean }[];
  selected: string[];
  onChange: (ids: string[]) => void;
  onSubmit: () => void;
  actionLabel: string;
  disabled: boolean;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="flex max-h-32 flex-wrap gap-2 overflow-auto">
        {tables
          .filter((t) => t.isActive)
          .map((t) => {
            const checked = selected.includes(t.id);
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
                    onChange(e.target.checked ? [...selected, t.id] : selected.filter((id) => id !== t.id))
                  }
                />
                T{t.tableNumber} ({t.capacityMin}
                {t.capacityMax != null ? `–${t.capacityMax}` : "+"}) · {t.operationalStatus}
              </label>
            );
          })}
        {tables.length === 0 ? <p className="text-xs text-muted-foreground">No tables configured.</p> : null}
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled}
        className="mt-2 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
      >
        {actionLabel}
      </button>
    </div>
  );
}
