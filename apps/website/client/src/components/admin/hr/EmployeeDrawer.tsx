import { useEffect, useRef } from "react";
import { X } from "lucide-react";

import type { AdminStaffInvite } from "@/lib/admin-api";

export function EmployeeDrawer({
  invite,
  onClose,
}: {
  invite: AdminStaffInvite | null;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!invite) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [invite, onClose]);

  if (!invite) return null;

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
        <div className="flex items-center justify-between border-b border-[var(--admin-border)] px-4 py-3">
          <h2 id="employee-drawer-title" className="text-lg font-semibold">
            Staff invitation
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 min-w-11 rounded-lg border border-[var(--admin-border)] p-2"
            aria-label="Close drawer"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <EmployeeProfile invite={invite} />
        </div>
      </aside>
    </div>
  );
}

function EmployeeProfile({ invite }: { invite: AdminStaffInvite }) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-[var(--admin-muted)]">
        Invitation record only — not a full employee profile. Active employee profiles require directory API.
      </p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Full name</dt>
          <dd className="mt-1">{invite.fullName}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Email</dt>
          <dd className="mt-1">{invite.email}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Phone</dt>
          <dd className="mt-1">{invite.phone ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Role</dt>
          <dd className="mt-1 capitalize">{invite.roleCode.replace(/-/g, " ")}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Status</dt>
          <dd className="mt-1 capitalize">{invite.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-muted)]">Branch ID</dt>
          <dd className="mt-1 font-mono text-xs">{invite.branchId}</dd>
        </div>
      </dl>
      <section aria-labelledby="profile-sections-unavailable" className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-3 py-3">
        <h3 id="profile-sections-unavailable" className="text-sm font-semibold">
          Unavailable profile sections
        </h3>
        <ul className="mt-2 list-disc pl-5 text-xs text-[var(--admin-muted)]">
          <li>Personal information beyond invite fields</li>
          <li>Emergency contact</li>
          <li>Documents</li>
          <li>Attendance history</li>
          <li>Leave history</li>
          <li>Performance reviews</li>
          <li>Training records</li>
          <li>Payroll summary</li>
        </ul>
      </section>
    </div>
  );
}

export { EmployeeProfile };
