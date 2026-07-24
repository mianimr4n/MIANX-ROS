import type { AdminOperationsDashboard } from "@/lib/admin-api";
import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function BranchComparison({
  rows,
}: {
  rows: NonNullable<AdminOperationsDashboard["branchPerformance"]> | null;
}) {
  return (
    <AdminSurface aria-labelledby="branch-comparison-heading" className="mb-6">
      <AdminSurfaceHeader
        title="Branch comparison"
        description="Today's orders and gross sales by branch — select All Branches for ranking."
      />
      <AdminSurfaceBody className="overflow-x-auto pt-0">
        <h2 id="branch-comparison-heading" className="sr-only">
          Branch comparison
        </h2>
        {!rows || rows.length === 0 ? (
          <p className="py-6 text-sm text-[var(--admin-muted)]">
            Branch comparison appears when All Branches is selected and activity exists in the dashboard API.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <caption className="sr-only">Branch comparison for today</caption>
            <thead className="text-[var(--admin-muted)]">
              <tr className="border-b border-[var(--admin-border)]">
                <th scope="col" className="py-3 pr-3 font-medium">
                  Branch
                </th>
                <th scope="col" className="py-3 pr-3 font-medium">
                  Gross sales
                </th>
                <th scope="col" className="py-3 pr-3 font-medium">
                  Orders
                </th>
                <th scope="col" className="py-3 pr-3 font-medium">
                  Avg order
                </th>
                <th scope="col" className="py-3 font-medium">
                  Active
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const avg =
                  row.todayOrders > 0 ? Math.round(row.todayGrossSales / row.todayOrders) : null;
                return (
                  <tr key={row.branchId} className="border-b border-[var(--admin-border)]/70">
                    <td className="py-3 pr-3 font-medium">{row.branchCode ?? row.branchId}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      Rs {Math.round(row.todayGrossSales).toLocaleString("en-PK")}
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{row.todayOrders}</td>
                    <td className="py-3 pr-3 tabular-nums">
                      {avg != null ? `Rs ${avg.toLocaleString("en-PK")}` : "—"}
                    </td>
                    <td className="py-3 tabular-nums">{row.activeOrders}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
