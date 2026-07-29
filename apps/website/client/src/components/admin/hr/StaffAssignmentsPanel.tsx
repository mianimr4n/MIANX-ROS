/**
 * Opening M1 — branch staff assignments (persisted user_roles lifecycle).
 * No passwords. No demo staff.
 */
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { useAdminBranch } from "@/contexts/AdminBranchContext";
import { ApiRequestError } from "@/lib/api";
import {
  ASSIGNABLE_STAFF_ROLE_CODES,
  createStaffAssignment,
  deactivateStaffAssignment,
  listStaffAssignmentHistory,
  listStaffAssignments,
  listAvailableStaffUsers,
  reactivateStaffAssignment,
  type StaffAssignment,
  type StaffAssignmentEvent,
} from "@/lib/admin-api";

const REQUIRED_OPENING_ROLES = ASSIGNABLE_STAFF_ROLE_CODES;

function errText(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message || `Request failed (${err.statusCode})`;
  return err instanceof Error ? err.message : "The action failed.";
}

function honesty(status: string, problem: string, next: string) {
  return (
    <dl className="mt-2 grid gap-1 text-sm text-[var(--admin-muted)] sm:grid-cols-3">
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Status</dt>
        <dd>{status}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Problem</dt>
        <dd>{problem}</dd>
      </div>
      <div>
        <dt className="font-semibold text-[var(--admin-ink)]">Next action</dt>
        <dd>{next}</dd>
      </div>
    </dl>
  );
}

export function StaffAssignmentsPanel() {
  const { session, isSuperAdmin, roles } = useAuth();
  const { branchIdFilter, allowedBranches, label: branchLabel } = useAdminBranch();
  const token = session?.access_token;
  const branchId = branchIdFilter ?? allowedBranches[0]?.id ?? null;
  const canWrite = isSuperAdmin || roles.includes("branch-manager");

  const [rows, setRows] = useState<StaffAssignment[] | null>(null);
  const [users, setUsers] = useState<Array<{ userId: string; email: string | null; fullName: string | null }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<StaffAssignmentEvent[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [userId, setUserId] = useState("");
  const [roleCode, setRoleCode] = useState<string>("cashier");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!token || !branchId) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const [assignments, available] = await Promise.all([
        listStaffAssignments(token, branchId),
        listAvailableStaffUsers(token, branchId).catch(() => []),
      ]);
      setRows(assignments);
      setUsers(available);
      setError(null);
    } catch (err) {
      setRows(null);
      setError(errText(err));
    } finally {
      setLoading(false);
    }
  }, [token, branchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = useMemo(() => {
    const list = rows ?? [];
    const activeByRole = new Set(
      list.filter((r) => r.assignmentStatus === "ACTIVE").map((r) => r.roleCode),
    );
    const assigned = REQUIRED_OPENING_ROLES.filter((r) => activeByRole.has(r)).length;
    const missing = REQUIRED_OPENING_ROLES.length - assigned;
    const invited = list.filter((r) => r.assignmentStatus === "INVITED").length;
    const inactive = list.filter((r) =>
      ["INACTIVE", "SUSPENDED", "REVOKED"].includes(r.assignmentStatus),
    ).length;
    return { assigned, missing, invited, inactive, required: REQUIRED_OPENING_ROLES.length };
  }, [rows]);

  const empty = !loading && (rows?.length ?? 0) === 0;

  async function onAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !branchId || !userId) return;
    setBusyId("create");
    try {
      await createStaffAssignment(token, {
        branchId,
        userId,
        roleCode,
        notes: notes.trim() || null,
      });
      setNotes("");
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onDeactivate(id: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await deactivateStaffAssignment(token, id);
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onReactivate(id: string) {
    if (!token) return;
    setBusyId(id);
    try {
      await reactivateStaffAssignment(token, id);
      await load();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusyId(null);
    }
  }

  async function onHistory(id: string) {
    if (!token) return;
    setBusyId(`h-${id}`);
    try {
      setHistory(await listStaffAssignmentHistory(token, id));
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusyId(null);
    }
  }

  const problem =
    summary.missing > 0
      ? `${summary.missing} required opening role(s) missing for ${branchLabel}.`
      : "None.";
  const next =
    summary.missing > 0
      ? "Assign named users to each required canonical role for Royal Orchard."
      : "Verify assignments and proceed to floor / booking readiness.";

  return (
    <section
      className="rounded-xl border border-[var(--admin-border)] bg-white p-4 shadow-sm"
      aria-labelledby="staff-assignments-heading"
    >
      <h2 id="staff-assignments-heading" className="text-lg font-semibold text-[var(--admin-ink)]">
        Staff assignments
      </h2>
      <p className="mt-1 text-sm text-[var(--admin-muted)]">
        Branch-scoped operating staff for {branchLabel}. Route presence alone does not mark people
        readiness complete.
      </p>
      {honesty(
        summary.assigned === summary.required ? "ACTIVE staff coverage" : "SETUP REQUIRED",
        empty ? "No real operating staff assigned" : problem,
        empty ? "Assign the first named operating staff member." : next,
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="text-[var(--admin-muted)]">Required roles</div>
          <div className="text-xl font-semibold">{summary.required}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="text-[var(--admin-muted)]">Assigned</div>
          <div className="text-xl font-semibold">{summary.assigned}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="text-[var(--admin-muted)]">Missing</div>
          <div className="text-xl font-semibold">{summary.missing}</div>
        </div>
        <div className="rounded-lg bg-slate-50 p-3 text-sm">
          <div className="text-[var(--admin-muted)]">Invited / inactive</div>
          <div className="text-xl font-semibold">
            {summary.invited} / {summary.inactive}
          </div>
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}

      {canWrite ? (
        <form className="mt-4 grid gap-3 rounded-lg border border-dashed border-[var(--admin-border)] p-3 md:grid-cols-4" onSubmit={onAssign}>
          <label className="text-sm">
            <span className="font-medium">Existing user</span>
            <select
              className="mt-1 w-full rounded-md border border-[var(--admin-border)] px-2 py-2"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
            >
              <option value="">Select user</option>
              {users.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.fullName || u.email || u.userId}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-medium">Canonical role</span>
            <select
              className="mt-1 w-full rounded-md border border-[var(--admin-border)] px-2 py-2"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
            >
              {REQUIRED_OPENING_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm md:col-span-1">
            <span className="font-medium">Notes</span>
            <input
              className="mt-1 w-full rounded-md border border-[var(--admin-border)] px-2 py-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busyId === "create" || !branchId}
              className="min-h-11 w-full rounded-md bg-[var(--brand-red)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Assign
            </button>
          </div>
          <p className="md:col-span-4 text-xs text-[var(--admin-muted)]">
            Branch is fixed to the admin branch selector ({branchLabel}). Passwords are never requested.
          </p>
        </form>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        {loading ? <p className="text-sm text-[var(--admin-muted)]">Loading assignments…</p> : null}
        {empty ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950">
            No real operating staff assigned
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)]">
                <th className="py-2 pr-3 font-medium">Name / email</th>
                <th className="py-2 pr-3 font-medium">Role</th>
                <th className="py-2 pr-3 font-medium">Branch</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Invitation</th>
                <th className="py-2 pr-3 font-medium">Verified</th>
                <th className="py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((row) => (
                <tr key={row.id} className="border-b border-[var(--admin-border)]/60">
                  <td className="py-2 pr-3">
                    <div className="font-medium text-[var(--admin-ink)]">{row.userFullName || "—"}</div>
                    <div className="text-[var(--admin-muted)]">{row.userEmail || row.userId}</div>
                  </td>
                  <td className="py-2 pr-3">{row.roleCode}</td>
                  <td className="py-2 pr-3">{row.branchName || row.branchCode || "—"}</td>
                  <td className="py-2 pr-3">{row.assignmentStatus}</td>
                  <td className="py-2 pr-3">{row.invitationId ? "linked" : "—"}</td>
                  <td className="py-2 pr-3">
                    {row.verifiedAt ? new Date(row.verifiedAt).toLocaleString() : "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      {row.assignmentStatus === "ACTIVE" ? (
                        <button
                          type="button"
                          className="min-h-10 rounded border px-2 text-xs font-semibold"
                          disabled={busyId === row.id}
                          onClick={() => void onDeactivate(row.id)}
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="min-h-10 rounded border px-2 text-xs font-semibold"
                          disabled={busyId === row.id}
                          onClick={() => void onReactivate(row.id)}
                        >
                          Reactivate
                        </button>
                      )}
                      <button
                        type="button"
                        className="min-h-10 rounded border px-2 text-xs font-semibold"
                        disabled={busyId === `h-${row.id}`}
                        onClick={() => void onHistory(row.id)}
                      >
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {history ? (
        <div className="mt-4 rounded-lg border border-[var(--admin-border)] p-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Assignment history</h3>
            <button type="button" className="text-sm underline" onClick={() => setHistory(null)}>
              Close
            </button>
          </div>
          <ul className="mt-2 space-y-1 text-sm">
            {history.map((e) => (
              <li key={e.id}>
                {new Date(e.createdAt).toLocaleString()} — {e.eventType} ({e.fromStatus ?? "∅"} →{" "}
                {e.toStatus ?? "∅"})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
