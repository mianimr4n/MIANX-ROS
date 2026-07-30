import { useState, type FormEvent } from "react";

import type { HrEmployee } from "@/lib/admin-api";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function EmployeeDirectory({
  employees,
  employeesLoading,
  employeesError,
  canManage,
  canLoad,
  selectedEmployeeId,
  onSelectEmployee,
  onAddEmployee,
  addError,
  addBusy,
  defaultBranchId,
}: {
  employees: HrEmployee[] | null;
  employeesLoading: boolean;
  employeesError: string | null;
  canManage: boolean;
  canLoad: boolean;
  selectedEmployeeId: string | null;
  onSelectEmployee: (employee: HrEmployee) => void;
  onAddEmployee: (input: {
    branchId: string;
    fullName: string;
    email: string;
    phone: string;
    role: string;
  }) => Promise<boolean>;
  addError: string | null;
  addBusy: boolean;
  defaultBranchId: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");
  const [branchId, setBranchId] = useState(defaultBranchId ?? "");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("");
    setBranchId(defaultBranchId ?? "");
    setShowForm(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!branchId) return;
    const ok = await onAddEmployee({
      branchId,
      fullName,
      email,
      phone,
      role,
    });
    if (ok) resetForm();
  };

  return (
    <AdminSurface aria-labelledby="employee-directory-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Employee directory"
        description="Employee records for the selected branch."
        action={
          canManage ? (
            <button
              type="button"
              className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-white"
              onClick={() => {
                setBranchId(defaultBranchId ?? "");
                setShowForm(true);
              }}
            >
              Add Employee
            </button>
          ) : null
        }
      />
      <AdminSurfaceBody className="overflow-x-auto pt-0">
        <h2 id="employee-directory-heading" className="sr-only">
          Employee directory
        </h2>

        {showForm && canManage ? (
          <form
            onSubmit={(e) => void submit(e)}
            className="mb-4 grid gap-3 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] p-4 sm:grid-cols-2"
          >
            <label className="text-sm">
              <span className="mb-1 block font-medium">Full name</span>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-md border border-[var(--admin-border)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-[var(--admin-border)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-md border border-[var(--admin-border)] px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block font-medium">Role</span>
              <input
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. cashier"
                className="w-full rounded-md border border-[var(--admin-border)] px-3 py-2"
              />
            </label>
            <label className="text-sm sm:col-span-2">
              <span className="mb-1 block font-medium">Branch ID</span>
              <input
                required
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full rounded-md border border-[var(--admin-border)] px-3 py-2 font-mono text-xs"
              />
            </label>
            {addError ? (
              <p className="text-sm text-amber-800 sm:col-span-2" role="status">
                {addError}
              </p>
            ) : null}
            <div className="flex gap-2 sm:col-span-2">
              <button
                type="submit"
                disabled={addBusy}
                className="rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
              >
                {addBusy ? "Saving…" : "Save employee"}
              </button>
              <button
                type="button"
                className="rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-sm"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : null}

        {!canLoad ? (
          <p className="text-sm text-[var(--admin-muted)]">
            Employee directory requires staff.manage or admin.access.
          </p>
        ) : employeesLoading ? (
          <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
            Loading employees…
          </p>
        ) : employeesError ? (
          <p className="text-sm text-[var(--admin-muted)]" role="status">
            We couldn&apos;t load employees right now. Please try again.
          </p>
        ) : !employees || employees.length === 0 ? (
          <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
            <p className="font-semibold text-[var(--admin-ink)]">Welcome! No staff added yet.</p>
            <p className="mt-1 text-sm text-[var(--admin-muted)]">
              Click &apos;Add Employee&apos; to get started.
            </p>
            {canManage ? (
              <button
                type="button"
                className="mt-4 rounded-lg bg-[var(--brand-red)] px-3 py-1.5 text-sm font-semibold text-white"
                onClick={() => {
                  setBranchId(defaultBranchId ?? "");
                  setShowForm(true);
                }}
              >
                Add Employee
              </button>
            ) : null}
          </div>
        ) : (
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Employees</caption>
            <thead className="bg-[var(--admin-soft)] text-xs uppercase tracking-wide text-[var(--admin-muted)]">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Name
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Email
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Role
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Branch
                </th>
                <th scope="col" className="px-3 py-2 font-semibold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr
                  key={employee.id}
                  className={`border-t border-[var(--admin-border)] ${
                    selectedEmployeeId === employee.id ? "bg-sky-50" : ""
                  }`}
                >
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      className="font-medium text-[var(--brand-red)] underline"
                      onClick={() => onSelectEmployee(employee)}
                    >
                      {employee.fullName}
                    </button>
                  </td>
                  <td className="px-3 py-2">{employee.email}</td>
                  <td className="px-3 py-2 capitalize">{employee.role.replace(/-/g, " ")}</td>
                  <td className="px-3 py-2">{employee.branchName ?? employee.branchCode ?? "—"}</td>
                  <td className="px-3 py-2 capitalize">{employee.status.replace(/_/g, " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
