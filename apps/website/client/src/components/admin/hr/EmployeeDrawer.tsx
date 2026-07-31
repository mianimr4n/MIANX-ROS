import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";

import {
  deactivateHrEmployee,
  patchHrEmployee,
  reactivateHrEmployee,
  type HrEmployee,
  type HrEmploymentType,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";

const EMPLOYMENT_TYPES: HrEmploymentType[] = ["full_time", "part_time", "contract", "casual"];

export function EmployeeDrawer({
  employee,
  accessToken,
  canManage,
  onClose,
  onUpdated,
}: {
  employee: HrEmployee | null;
  accessToken: string | undefined;
  canManage: boolean;
  onClose: () => void;
  onUpdated: (employee: HrEmployee) => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [employmentType, setEmploymentType] = useState<HrEmploymentType | "">("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [deactivateReason, setDeactivateReason] = useState("");
  const [reactivateReason, setReactivateReason] = useState("");
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!employee) return;
    setEditing(false);
    setShowDeactivate(false);
    setError(null);
    setFullName(employee.fullName);
    setEmail(employee.email);
    setPhone(employee.phone ?? "");
    setRole(employee.role);
    setEmployeeNumber(employee.employeeNumber ?? "");
    setEmploymentType(employee.employmentType ?? "");
    setEmergencyContactName(employee.emergencyContactName ?? "");
    setEmergencyContactPhone(employee.emergencyContactPhone ?? "");
    setDeactivateReason("");
    setReactivateReason("");
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [employee, onClose]);

  if (!employee) return null;

  const employeeId = employee.id;

  async function onSaveEdit(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !canManage) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await patchHrEmployee(accessToken, employeeId, {
        fullName,
        email,
        phone: phone || null,
        role,
        employeeNumber: employeeNumber || null,
        employmentType: employmentType || null,
        emergencyContactName: emergencyContactName || null,
        emergencyContactPhone: emergencyContactPhone || null,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to update employee.");
    } finally {
      setBusy(false);
    }
  }

  async function onDeactivate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !canManage) return;
    const reason = deactivateReason.trim();
    if (!reason) {
      setError("Deactivation reason is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await deactivateHrEmployee(accessToken, employeeId, { reason });
      onUpdated(updated);
      setShowDeactivate(false);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to deactivate employee.");
    } finally {
      setBusy(false);
    }
  }

  async function onReactivate() {
    if (!accessToken || !canManage) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await reactivateHrEmployee(
        accessToken,
        employeeId,
        reactivateReason.trim() || null,
      );
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "Failed to reactivate employee.");
    } finally {
      setBusy(false);
    }
  }

  const isInactive = employee.status === "inactive" || employee.status === "terminated";

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Close employee drawer"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-5 py-4">
          <div>
            <h2 id="employee-drawer-title" className="text-lg font-semibold">
              {employee.fullName}
            </h2>
            {employee.employeeNumber ? (
              <p className="text-xs text-[var(--admin-muted)]">#{employee.employeeNumber}</p>
            ) : null}
          </div>
          <button
            ref={closeRef}
            type="button"
            className="rounded-md p-2 text-[var(--admin-muted)] hover:bg-[var(--admin-soft)]"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error ? (
            <p className="mb-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {editing ? (
            <form onSubmit={(e) => void onSaveEdit(e)} className="space-y-3 text-sm">
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Full name
                <input
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Email
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Role
                <input
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Employee number
                <input
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Employment type
                <select
                  value={employmentType}
                  onChange={(e) => setEmploymentType(e.target.value as HrEmploymentType | "")}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                >
                  <option value="">Not set</option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Emergency contact name
                <input
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                />
              </label>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Emergency contact phone
                <input
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 font-normal normal-case"
                />
              </label>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-10 rounded-lg bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                  className="min-h-10 rounded-lg border border-[var(--admin-border)] px-4 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-4 text-sm" role="region" aria-label="Employee details">
              <div>
                <dt className="text-[var(--admin-muted)]">Email</dt>
                <dd className="mt-1 font-medium">{employee.email}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Phone</dt>
                <dd className="mt-1 font-medium">{employee.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Role</dt>
                <dd className="mt-1 font-medium capitalize">{employee.role.replace(/-/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Employment type</dt>
                <dd className="mt-1 font-medium capitalize">
                  {employee.employmentType?.replace(/_/g, " ") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Status</dt>
                <dd className="mt-1 font-medium capitalize">{employee.status.replace(/_/g, " ")}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Branch</dt>
                <dd className="mt-1 font-medium">{employee.branchName ?? employee.branchCode ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Hired</dt>
                <dd className="mt-1 font-medium">{employee.hiredAt ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--admin-muted)]">Emergency contact</dt>
                <dd className="mt-1 font-medium">
                  {employee.emergencyContactName
                    ? `${employee.emergencyContactName}${employee.emergencyContactPhone ? ` · ${employee.emergencyContactPhone}` : ""}`
                    : "—"}
                </dd>
              </div>
              {employee.deactivationReason ? (
                <div>
                  <dt className="text-[var(--admin-muted)]">Deactivation</dt>
                  <dd className="mt-1 font-medium">
                    {employee.deactivationReason}
                    {employee.deactivatedAt ? ` · ${employee.deactivatedAt.slice(0, 10)}` : ""}
                  </dd>
                </div>
              ) : null}
            </dl>
          )}

          {showDeactivate ? (
            <form onSubmit={(e) => void onDeactivate(e)} className="mt-6 space-y-3 border-t border-[var(--admin-border)] pt-4">
              <p className="text-sm font-semibold text-[var(--admin-ink)]">Deactivate employee</p>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Reason (required)
                <textarea
                  required
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-normal normal-case"
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="min-h-10 rounded-lg bg-red-700 px-4 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {busy ? "Deactivating…" : "Confirm deactivate"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setShowDeactivate(false)}
                  className="min-h-10 rounded-lg border border-[var(--admin-border)] px-4 text-sm font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {isInactive && canManage && !editing ? (
            <div className="mt-6 space-y-3 border-t border-[var(--admin-border)] pt-4">
              <p className="text-sm font-semibold text-[var(--admin-ink)]">Reactivate employee</p>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">
                Reason (optional)
                <input
                  value={reactivateReason}
                  onChange={(e) => setReactivateReason(e.target.value)}
                  className="mt-1 min-h-11 w-full rounded-lg border border-[var(--admin-border)] px-3 text-sm font-normal normal-case"
                />
              </label>
              <button
                type="button"
                disabled={busy}
                onClick={() => void onReactivate()}
                className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white disabled:opacity-40"
              >
                {busy ? "Reactivating…" : "Reactivate"}
              </button>
            </div>
          ) : null}
        </div>

        {canManage && !editing && !showDeactivate ? (
          <div className="flex gap-2 border-t border-[var(--admin-border)] px-5 py-4">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="min-h-10 flex-1 rounded-lg border border-[var(--admin-border)] bg-white px-4 text-sm font-semibold"
            >
              Edit
            </button>
            {!isInactive ? (
              <button
                type="button"
                onClick={() => setShowDeactivate(true)}
                className="min-h-10 flex-1 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-800"
              >
                Deactivate
              </button>
            ) : null}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
