/**
 * D3 — Floor Plan Workspace.
 *
 * Branch-scoped configuration of floors, service areas, physical tables, and
 * permitted table combinations. All writes go to the real /admin/floor API;
 * the visual map is a preview aid and every property is editable through
 * keyboard-accessible form fields (drag-and-drop is never the only method).
 */
import { useMemo, useState } from "react";

import { OperationalStatusBanner } from "@/components/admin/OperationalStatusBanner";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { useAdminAccessGate } from "@/hooks/useAdminAccessGate";
import { ApiRequestError } from "@/lib/api";
import {
  canAccessTableService,
  canManageFloorConfiguration,
  canSeatGuests,
} from "@/lib/admin-access";
import { useOperationalData } from "@/lib/op-status";
import {
  TABLE_STATUS_CLASSES,
  TABLE_STATUS_LABELS,
  createFloor,
  createServiceArea,
  createTableCombination,
  getFloorConfiguration,
  listTableCombinations,
  transitionTableStatus,
  updateFloor,
  updateServiceArea,
  updateTableCombination,
  updateTableLayout,
  type FloorTableRecord,
  type TableOperationalStatus,
  type TableShape,
} from "@/lib/table-service-api";
import { AdminShell } from "./AdminShell";

const SHAPES: TableShape[] = ["square", "rectangle", "round", "custom"];
/** Housekeeping transitions staff may trigger directly from configuration. */
const HOUSEKEEPING_TARGETS: TableOperationalStatus[] = ["available", "cleaning", "blocked", "out_of_service"];

function errText(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

type TableDraft = {
  displayName: string;
  floorId: string;
  serviceAreaId: string;
  capacityMin: string;
  capacityMax: string;
  shape: TableShape;
  positionX: string;
  positionY: string;
  width: string;
  height: string;
  rotation: string;
  isAccessible: boolean;
  highChairSupported: boolean;
  isActive: boolean;
};

function draftFromTable(t: FloorTableRecord): TableDraft {
  return {
    displayName: t.displayName ?? "",
    floorId: t.floorId ?? "",
    serviceAreaId: t.serviceAreaId ?? "",
    capacityMin: String(t.capacityMin),
    capacityMax: t.capacityMax == null ? "" : String(t.capacityMax),
    shape: t.shape,
    positionX: String(t.positionX),
    positionY: String(t.positionY),
    width: String(t.width),
    height: String(t.height),
    rotation: String(t.rotation),
    isAccessible: t.isAccessible,
    highChairSupported: t.highChairSupported,
    isActive: t.isActive,
  };
}

export default function AdminFloorPlan() {
  const { session, permissions, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();

  const principal = { roles, permissions, isSuperAdmin };
  const allowed = canAccessTableService(principal) || canManageFloorConfiguration(principal);
  const { gateReady } = useAdminAccessGate(allowed);
  const canConfigure = canManageFloorConfiguration(principal);
  const canHousekeep = canSeatGuests(principal);

  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;

  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedFloorId, setSelectedFloorId] = useState<string | "">("");

  const configOp = useOperationalData(
    ({ signal, correlationId }) => getFloorConfiguration(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady,
      isEmpty: (data) => data.floors.length === 0 && data.tables.length === 0,
    },
  );

  const combosOp = useOperationalData(
    ({ signal, correlationId }) => listTableCombinations(token!, branchId!, { signal, correlationId }),
    [token, branchId],
    {
      enabled: Boolean(token) && Boolean(branchId) && allowed && gateReady,
      isEmpty: (data) => data.length === 0,
    },
  );

  const config = configOp.data;
  const floors = config?.floors ?? [];
  const areas = config?.areas ?? [];
  const tables = config?.tables ?? [];

  const activeFloorId = selectedFloorId || floors[0]?.id || "";
  const floorTables = useMemo(
    () => tables.filter((t) => !activeFloorId || t.floorId === activeFloorId || t.floorId === null),
    [tables, activeFloorId],
  );

  // ---- create floor / area forms
  const [floorForm, setFloorForm] = useState({ code: "", displayName: "", sortOrder: "0" });
  const [areaForm, setAreaForm] = useState({ code: "", displayName: "", floorId: "", sortOrder: "0" });
  const [comboForm, setComboForm] = useState({
    code: "",
    displayName: "",
    minPartySize: "2",
    maxPartySize: "",
    tableIds: [] as string[],
  });

  // ---- table editor
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [tableDraft, setTableDraft] = useState<TableDraft | null>(null);
  const dirty = editingTableId != null;

  async function run(action: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await action();
      configOp.retry();
      combosOp.retry();
      return true;
    } catch (err) {
      setActionError(errText(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function submitFloor() {
    if (!token || !branchId || !floorForm.code || !floorForm.displayName) return;
    const ok = await run(() =>
      createFloor(token, {
        branchId,
        code: floorForm.code.trim(),
        displayName: floorForm.displayName.trim(),
        sortOrder: Number(floorForm.sortOrder) || 0,
      }),
    );
    if (ok) setFloorForm({ code: "", displayName: "", sortOrder: "0" });
  }

  async function submitArea() {
    if (!token || !branchId || !areaForm.code || !areaForm.displayName) return;
    const floorId = areaForm.floorId || activeFloorId;
    if (!floorId) return;
    const ok = await run(() =>
      createServiceArea(token, {
        branchId,
        floorId,
        code: areaForm.code.trim(),
        displayName: areaForm.displayName.trim(),
        sortOrder: Number(areaForm.sortOrder) || 0,
      }),
    );
    if (ok) setAreaForm({ code: "", displayName: "", floorId: "", sortOrder: "0" });
  }

  async function submitCombination() {
    if (!token || !branchId || !comboForm.code || !comboForm.displayName) return;
    if (comboForm.tableIds.length < 2) {
      setActionError("A combination needs at least two tables.");
      return;
    }
    const ok = await run(() =>
      createTableCombination(token, {
        branchId,
        code: comboForm.code.trim(),
        displayName: comboForm.displayName.trim(),
        minPartySize: Number(comboForm.minPartySize) || 2,
        maxPartySize: comboForm.maxPartySize ? Number(comboForm.maxPartySize) : undefined,
        tableIds: comboForm.tableIds,
      }),
    );
    if (ok) setComboForm({ code: "", displayName: "", minPartySize: "2", maxPartySize: "", tableIds: [] });
  }

  function validateDraft(d: TableDraft): string | null {
    const min = Number(d.capacityMin);
    const max = d.capacityMax === "" ? null : Number(d.capacityMax);
    if (!Number.isFinite(min) || min < 1) return "Capacity minimum must be at least 1.";
    if (max != null && (!Number.isFinite(max) || max < min)) {
      return "Capacity maximum must be greater than or equal to the minimum.";
    }
    for (const key of ["positionX", "positionY", "width", "height", "rotation"] as const) {
      if (!Number.isFinite(Number(d[key]))) return "Layout values must be numbers.";
    }
    return null;
  }

  async function saveTableDraft() {
    if (!token || !editingTableId || !tableDraft) return;
    const problem = validateDraft(tableDraft);
    if (problem) {
      setActionError(problem);
      return;
    }
    const ok = await run(() =>
      updateTableLayout(token, editingTableId, {
        displayName: tableDraft.displayName.trim() || null,
        floorId: tableDraft.floorId || null,
        serviceAreaId: tableDraft.serviceAreaId || null,
        capacityMin: Number(tableDraft.capacityMin),
        capacityMax: tableDraft.capacityMax === "" ? null : Number(tableDraft.capacityMax),
        shape: tableDraft.shape,
        positionX: Number(tableDraft.positionX),
        positionY: Number(tableDraft.positionY),
        width: Number(tableDraft.width),
        height: Number(tableDraft.height),
        rotation: Number(tableDraft.rotation),
        isAccessible: tableDraft.isAccessible,
        highChairSupported: tableDraft.highChairSupported,
        isActive: tableDraft.isActive,
      }),
    );
    if (ok) {
      setEditingTableId(null);
      setTableDraft(null);
    }
  }

  if (!gateReady) return null;

  return (
    <AdminShell title="Floor plan">
      <div className="space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Floor plan — {branchLabel}</h2>
            <p className="text-sm text-muted-foreground">
              Floors, service areas, tables, and permitted combinations. Changes are saved to the
              server and enforced branch-wide.
            </p>
          </div>
          {dirty ? (
            <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900">
              Unsaved table changes
            </span>
          ) : null}
        </header>

        {!branchId ? (
          <p className="rounded-xl border bg-muted/40 p-4 text-sm">
            Select a specific branch to configure its floor plan.
          </p>
        ) : null}

        <OperationalStatusBanner
          state={configOp.state}
          error={configOp.error}
          lastSuccessAt={configOp.lastSuccessAt}
          onRetry={configOp.retry}
          correlationId={configOp.correlationId}
          showTechnicalDetail={isSuperAdmin}
        />
        {actionError ? (
          <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
            {actionError}
          </p>
        ) : null}

        {configOp.state === "LOADING" ? (
          <p className="text-sm text-muted-foreground">Loading floor configuration…</p>
        ) : null}

        {config ? (
          <>
            {/* Floor selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Floor:</span>
              {floors.length === 0 ? (
                <span className="text-sm text-muted-foreground">EMPTY — no floors configured yet.</span>
              ) : (
                floors.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFloorId(f.id)}
                    className={`rounded-lg border px-3 py-1.5 text-sm ${
                      activeFloorId === f.id ? "border-primary bg-primary text-primary-foreground" : "bg-background"
                    } ${f.isActive ? "" : "opacity-60"}`}
                  >
                    {f.displayName}
                    {f.isActive ? "" : " (inactive)"}
                  </button>
                ))
              )}
            </div>

            {/* Visual map preview */}
            <section aria-label="Floor map preview" className="rounded-xl border bg-muted/20 p-3">
              <p className="mb-2 text-xs text-muted-foreground">
                Map preview (positions in layout units). Use the table list below to edit — every
                field is editable without drag-and-drop.
              </p>
              <div className="relative h-72 w-full overflow-auto rounded-lg border bg-background">
                {floorTables.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground">EMPTY — no tables on this floor.</p>
                ) : (
                  floorTables.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setEditingTableId(t.id);
                        setTableDraft(draftFromTable(t));
                      }}
                      title={`Table ${t.tableNumber} — ${TABLE_STATUS_LABELS[t.operationalStatus]}`}
                      className={`absolute flex items-center justify-center border text-xs font-semibold ${
                        TABLE_STATUS_CLASSES[t.operationalStatus]
                      } ${t.shape === "round" ? "rounded-full" : "rounded-md"} ${t.isActive ? "" : "opacity-50"}`}
                      style={{
                        left: `${Math.max(0, t.positionX)}px`,
                        top: `${Math.max(0, t.positionY)}px`,
                        width: `${Math.max(32, t.width)}px`,
                        height: `${Math.max(32, t.height)}px`,
                        transform: `rotate(${t.rotation}deg)`,
                      }}
                    >
                      {t.tableNumber}
                    </button>
                  ))
                )}
              </div>
            </section>

            {/* Table list (accessible editor) */}
            <section aria-label="Tables" className="rounded-xl border">
              <div className="border-b px-4 py-3">
                <h2 className="text-sm font-semibold">Tables ({floorTables.length})</h2>
              </div>
              <div className="divide-y">
                {floorTables.map((t) => {
                  const area = areas.find((a) => a.id === t.serviceAreaId);
                  const isEditing = editingTableId === t.id && tableDraft;
                  return (
                    <div key={t.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="font-semibold">Table {t.tableNumber}</span>
                          {t.displayName ? <span className="text-muted-foreground">{t.displayName}</span> : null}
                          <span
                            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${TABLE_STATUS_CLASSES[t.operationalStatus]}`}
                          >
                            {TABLE_STATUS_LABELS[t.operationalStatus]}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Seats {t.capacityMin}
                            {t.capacityMax != null ? `–${t.capacityMax}` : "+"} · {t.shape}
                            {area ? ` · ${area.displayName}` : ""}
                            {t.isAccessible ? " · accessible" : ""}
                            {t.highChairSupported ? " · high chair" : ""}
                            {t.isActive ? "" : " · INACTIVE"}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {canHousekeep
                            ? HOUSEKEEPING_TARGETS.filter((s) => s !== t.operationalStatus).map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  disabled={busy}
                                  onClick={() =>
                                    void run(() => transitionTableStatus(token!, t.id, s))
                                  }
                                  className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                                >
                                  Mark {TABLE_STATUS_LABELS[s].toLowerCase()}
                                </button>
                              ))
                            : null}
                          {canConfigure ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingTableId(null);
                                  setTableDraft(null);
                                } else {
                                  setEditingTableId(t.id);
                                  setTableDraft(draftFromTable(t));
                                }
                              }}
                              className="rounded-md border px-2 py-1 text-xs font-semibold hover:bg-muted"
                            >
                              {isEditing ? "Discard" : "Edit"}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      {isEditing && tableDraft ? (
                        <form
                          className="mt-3 grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-4"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void saveTableDraft();
                          }}
                        >
                          <label className="flex flex-col gap-1 text-xs">
                            Display name
                            <input
                              className="rounded-md border px-2 py-1.5"
                              value={tableDraft.displayName}
                              onChange={(e) => setTableDraft({ ...tableDraft, displayName: e.target.value })}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-xs">
                            Floor
                            <select
                              className="rounded-md border px-2 py-1.5"
                              value={tableDraft.floorId}
                              onChange={(e) => setTableDraft({ ...tableDraft, floorId: e.target.value })}
                            >
                              <option value="">Unassigned</option>
                              {floors.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {f.displayName}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs">
                            Service area
                            <select
                              className="rounded-md border px-2 py-1.5"
                              value={tableDraft.serviceAreaId}
                              onChange={(e) => setTableDraft({ ...tableDraft, serviceAreaId: e.target.value })}
                            >
                              <option value="">None</option>
                              {areas
                                .filter((a) => !tableDraft.floorId || a.floorId === tableDraft.floorId)
                                .map((a) => (
                                  <option key={a.id} value={a.id}>
                                    {a.displayName}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label className="flex flex-col gap-1 text-xs">
                            Shape
                            <select
                              className="rounded-md border px-2 py-1.5"
                              value={tableDraft.shape}
                              onChange={(e) => setTableDraft({ ...tableDraft, shape: e.target.value as TableShape })}
                            >
                              {SHAPES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </label>
                          {(
                            [
                              ["capacityMin", "Capacity min"],
                              ["capacityMax", "Capacity max"],
                              ["positionX", "Position X"],
                              ["positionY", "Position Y"],
                              ["width", "Width"],
                              ["height", "Height"],
                              ["rotation", "Rotation"],
                            ] as const
                          ).map(([key, label]) => (
                            <label key={key} className="flex flex-col gap-1 text-xs">
                              {label}
                              <input
                                type="number"
                                className="rounded-md border px-2 py-1.5"
                                value={tableDraft[key]}
                                onChange={(e) => setTableDraft({ ...tableDraft, [key]: e.target.value })}
                              />
                            </label>
                          ))}
                          <div className="col-span-2 flex flex-wrap items-center gap-4 md:col-span-4">
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={tableDraft.isAccessible}
                                onChange={(e) => setTableDraft({ ...tableDraft, isAccessible: e.target.checked })}
                              />
                              Accessible
                            </label>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={tableDraft.highChairSupported}
                                onChange={(e) =>
                                  setTableDraft({ ...tableDraft, highChairSupported: e.target.checked })
                                }
                              />
                              High chair
                            </label>
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                checked={tableDraft.isActive}
                                onChange={(e) => setTableDraft({ ...tableDraft, isActive: e.target.checked })}
                              />
                              Active
                            </label>
                            <button
                              type="submit"
                              disabled={busy}
                              className="ml-auto rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                            >
                              Save table
                            </button>
                          </div>
                        </form>
                      ) : null}
                    </div>
                  );
                })}
                {floorTables.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-muted-foreground">EMPTY — no tables.</p>
                ) : null}
              </div>
            </section>

            {/* Configuration forms */}
            {canConfigure ? (
              <div className="grid gap-4 lg:grid-cols-3">
                <form
                  className="space-y-2 rounded-xl border p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitFloor();
                  }}
                >
                  <h2 className="text-sm font-semibold">Add floor</h2>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Code (e.g. ground)"
                    value={floorForm.code}
                    onChange={(e) => setFloorForm({ ...floorForm, code: e.target.value })}
                  />
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Display name"
                    value={floorForm.displayName}
                    onChange={(e) => setFloorForm({ ...floorForm, displayName: e.target.value })}
                  />
                  <input
                    type="number"
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Sort order"
                    value={floorForm.sortOrder}
                    onChange={(e) => setFloorForm({ ...floorForm, sortOrder: e.target.value })}
                  />
                  <button
                    type="submit"
                    disabled={busy || !floorForm.code || !floorForm.displayName}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Create floor
                  </button>
                  {floors.length > 0 ? (
                    <div className="space-y-1 border-t pt-2">
                      {floors.map((f) => (
                        <div key={f.id} className="flex items-center justify-between text-xs">
                          <span>
                            {f.displayName} ({f.code}){f.isActive ? "" : " — inactive"}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => void run(() => updateFloor(token!, f.id, { isActive: !f.isActive }))}
                            className="rounded-md border px-2 py-0.5 hover:bg-muted disabled:opacity-50"
                          >
                            {f.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </form>

                <form
                  className="space-y-2 rounded-xl border p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitArea();
                  }}
                >
                  <h2 className="text-sm font-semibold">Add service area</h2>
                  <select
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    value={areaForm.floorId || activeFloorId}
                    onChange={(e) => setAreaForm({ ...areaForm, floorId: e.target.value })}
                  >
                    {floors.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.displayName}
                      </option>
                    ))}
                  </select>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Code (e.g. main-hall)"
                    value={areaForm.code}
                    onChange={(e) => setAreaForm({ ...areaForm, code: e.target.value })}
                  />
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Display name"
                    value={areaForm.displayName}
                    onChange={(e) => setAreaForm({ ...areaForm, displayName: e.target.value })}
                  />
                  <button
                    type="submit"
                    disabled={busy || !areaForm.code || !areaForm.displayName || floors.length === 0}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Create area
                  </button>
                  {areas.length > 0 ? (
                    <div className="space-y-1 border-t pt-2">
                      {areas.map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-xs">
                          <span>
                            {a.displayName} ({a.code}){a.isActive ? "" : " — inactive"}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(() => updateServiceArea(token!, a.id, { isActive: !a.isActive }))
                            }
                            className="rounded-md border px-2 py-0.5 hover:bg-muted disabled:opacity-50"
                          >
                            {a.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </form>

                <form
                  className="space-y-2 rounded-xl border p-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void submitCombination();
                  }}
                >
                  <h2 className="text-sm font-semibold">Add table combination</h2>
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Code (e.g. family-8)"
                    value={comboForm.code}
                    onChange={(e) => setComboForm({ ...comboForm, code: e.target.value })}
                  />
                  <input
                    className="w-full rounded-md border px-2 py-1.5 text-sm"
                    placeholder="Display name"
                    value={comboForm.displayName}
                    onChange={(e) => setComboForm({ ...comboForm, displayName: e.target.value })}
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      placeholder="Min party"
                      value={comboForm.minPartySize}
                      onChange={(e) => setComboForm({ ...comboForm, minPartySize: e.target.value })}
                    />
                    <input
                      type="number"
                      className="w-full rounded-md border px-2 py-1.5 text-sm"
                      placeholder="Max party"
                      value={comboForm.maxPartySize}
                      onChange={(e) => setComboForm({ ...comboForm, maxPartySize: e.target.value })}
                    />
                  </div>
                  <fieldset className="max-h-32 space-y-1 overflow-auto rounded-md border p-2">
                    <legend className="px-1 text-xs font-medium">Tables (pick two or more)</legend>
                    {tables.map((t) => (
                      <label key={t.id} className="flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={comboForm.tableIds.includes(t.id)}
                          onChange={(e) =>
                            setComboForm({
                              ...comboForm,
                              tableIds: e.target.checked
                                ? [...comboForm.tableIds, t.id]
                                : comboForm.tableIds.filter((id) => id !== t.id),
                            })
                          }
                        />
                        Table {t.tableNumber} (seats {t.capacityMin}
                        {t.capacityMax != null ? `–${t.capacityMax}` : "+"})
                      </label>
                    ))}
                  </fieldset>
                  <button
                    type="submit"
                    disabled={busy || comboForm.tableIds.length < 2 || !comboForm.code || !comboForm.displayName}
                    className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    Create combination
                  </button>
                  {(combosOp.data ?? []).length > 0 ? (
                    <div className="space-y-1 border-t pt-2">
                      {(combosOp.data ?? []).map((c) => (
                        <div key={c.id} className="flex items-center justify-between text-xs">
                          <span>
                            {c.displayName} — {c.tableIds.length} tables, seats {c.derivedCapacity}
                            {c.isActive ? "" : " — inactive"}
                          </span>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() =>
                              void run(() => updateTableCombination(token!, c.id, { isActive: !c.isActive }))
                            }
                            className="rounded-md border px-2 py-0.5 hover:bg-muted disabled:opacity-50"
                          >
                            {c.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : combosOp.state === "EMPTY" ? (
                    <p className="border-t pt-2 text-xs text-muted-foreground">EMPTY — no combinations.</p>
                  ) : null}
                </form>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Floor configuration is read-only for your role.
              </p>
            )}
          </>
        ) : null}
      </div>
    </AdminShell>
  );
}
