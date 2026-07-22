import type { AdminStaffInvite } from "@/lib/admin-api";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function EmployeeDirectory({
  invites,
  invitesLoading,
  invitesError,
  canLoadInvites,
  onSelectInvite,
  selectedInviteId,
}: {
  invites: AdminStaffInvite[] | null;
  invitesLoading: boolean;
  invitesError: string | null;
  canLoadInvites: boolean;
  onSelectInvite: (invite: AdminStaffInvite) => void;
  selectedInviteId: string | null;
}) {
  return (
    <AdminSurface aria-labelledby="employee-directory-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Employee directory"
        description="Verified employees only — no employee list API; staff invites shown when super-admin API succeeds."
      />
      <AdminSurfaceBody className="overflow-x-auto pt-0">
        <h2 id="employee-directory-heading" className="sr-only">
          Employee directory
        </h2>
        <div className="mb-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-3 text-sm">
          <p className="font-semibold text-[var(--admin-ink)]">No employees in repository API</p>
          <p className="mt-1 text-[var(--admin-muted)]">
            GET /admin/staff does not exist. The staff table is not exposed to admin UI — frontend cannot list active
            employees.
          </p>
        </div>
        {canLoadInvites ? (
          <>
            <h3 className="mb-2 text-sm font-semibold">Staff invitations (partial)</h3>
            {invitesLoading ? (
              <p className="text-sm text-[var(--admin-muted)]" aria-live="polite">
                Loading staff invites…
              </p>
            ) : invitesError ? (
              <p className="text-sm text-amber-800" role="status">
                {invitesError}
              </p>
            ) : !invites || invites.length === 0 ? (
              <p className="text-sm text-[var(--admin-muted)]">No staff invitations returned.</p>
            ) : (
              <table className="min-w-full text-left text-sm">
                <caption className="sr-only">Staff invitations</caption>
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
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr
                      key={invite.id}
                      className={`border-t border-[var(--admin-border)] ${selectedInviteId === invite.id ? "bg-sky-50" : ""}`}
                    >
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          className="font-medium text-[var(--brand-red)] underline"
                          onClick={() => onSelectInvite(invite)}
                        >
                          {invite.fullName}
                        </button>
                      </td>
                      <td className="px-3 py-2">{invite.email}</td>
                      <td className="px-3 py-2 capitalize">{invite.roleCode.replace(/-/g, " ")}</td>
                      <td className="px-3 py-2 capitalize">{invite.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--admin-muted)]">
            Staff invite list requires super-admin backend access — not available for this session.
          </p>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
