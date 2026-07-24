import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function OrganizationTree() {
  return (
    <AdminSurface aria-labelledby="org-tree-heading" className="mb-6">
      <AdminSurfaceHeader title="Organization structure" description="Enterprise org tree requires department hierarchy API." />
      <AdminSurfaceBody>
        <h2 id="org-tree-heading" className="sr-only">
          Organization structure
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6">
          <p className="font-semibold text-[var(--admin-ink)]">Organization foundation</p>
          <ul className="mt-3 space-y-2 text-sm text-[var(--admin-muted)]" role="tree" aria-label="Organization placeholder">
            <li role="treeitem" aria-expanded="true">
              Telepizza Organization
              <ul className="ml-4 mt-2 space-y-1 border-l border-[var(--admin-border)] pl-3" role="group">
                <li role="treeitem">Branches — branch.read API exists; org tree API does not</li>
                <li role="treeitem">Departments — no departments table</li>
                <li role="treeitem">Employees — staff table exists; no directory API</li>
              </ul>
            </li>
          </ul>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}

export function DepartmentManager() {
  return (
    <AdminSurface aria-labelledby="department-manager-heading" className="mb-6">
      <AdminSurfaceHeader title="Departments" description="Kitchen, service, delivery, management — requires department master." />
      <AdminSurfaceBody>
        <h2 id="department-manager-heading" className="sr-only">
          Departments
        </h2>
        <div className="rounded-xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-center">
          <p className="font-semibold text-[var(--admin-ink)]">No department master in repository</p>
          <p className="mt-2 text-sm text-[var(--admin-muted)]">
            staff.department is a free-text column — not a managed hierarchy with managers or cost centers.
          </p>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
