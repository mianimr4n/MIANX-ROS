import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import type { HrEmployee } from "@/lib/admin-api";

export function EmployeeDrawer({
  employee,
  onClose,
}: {
  employee: HrEmployee | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!employee) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [employee, onClose]);

  if (!employee) return null;

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
          <h2 id="employee-drawer-title" className="text-lg font-semibold">
            {employee.fullName}
          </h2>
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
        <dl
          className="space-y-4 overflow-y-auto px-5 py-4 text-sm"
          tabIndex={0}
          role="region"
          aria-label="Employee details"
        >
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
        </dl>
      </aside>
    </div>
  );
}
