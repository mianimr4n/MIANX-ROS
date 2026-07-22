import { SEEDED_PERMISSIONS, SEEDED_ROLES } from "@/lib/admin-hr";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function RolesPermissionPanel({
  currentRoles,
  currentPermissions,
}: {
  currentRoles: string[];
  currentPermissions: string[];
}) {
  return (
    <AdminSurface aria-labelledby="roles-permissions-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Roles &amp; permissions"
        description="Verified RBAC seed — your session roles below; no invented permission codes."
      />
      <AdminSurfaceBody>
        <h2 id="roles-permissions-heading" className="sr-only">
          Roles and permissions
        </h2>
        <div className="mb-6 rounded-xl border border-[var(--admin-border)] bg-white px-4 py-3">
          <h3 className="text-sm font-semibold">Your session (derived)</h3>
          <p className="mt-2 text-xs text-[var(--admin-muted)]">Roles: {currentRoles.join(", ") || "—"}</p>
          <p className="mt-1 text-xs text-[var(--admin-muted)]">
            Permissions: {currentPermissions.length ? currentPermissions.join(", ") : "—"}
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Seeded roles</h3>
            <ul className="space-y-2">
              {SEEDED_ROLES.map((role) => (
                <li key={role.code} className="rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm">
                  <p className="font-medium">{role.name}</p>
                  <p className="text-xs text-[var(--admin-muted)]">{role.code}</p>
                  <p className="mt-1 text-xs">{role.description}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Seeded permissions</h3>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-[var(--admin-border)]">
              <table className="min-w-full text-left text-xs">
                <caption className="sr-only">Seeded permission codes</caption>
                <thead className="sticky top-0 bg-[var(--admin-soft)] text-[var(--admin-muted)]">
                  <tr>
                    <th scope="col" className="px-2 py-2 font-semibold">
                      Code
                    </th>
                    <th scope="col" className="px-2 py-2 font-semibold">
                      Module
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {SEEDED_PERMISSIONS.map((perm) => (
                    <tr key={perm.code} className="border-t border-[var(--admin-border)]">
                      <td className="px-2 py-2 font-mono">{perm.code}</td>
                      <td className="px-2 py-2">{perm.module}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
