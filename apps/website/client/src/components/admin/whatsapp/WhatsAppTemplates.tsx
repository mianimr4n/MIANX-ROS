import { AdminSurface, AdminSurfaceBody, AdminSurfaceHeader } from "@/components/admin/AdminSurface";

export function WhatsAppTemplates() {
  return (
    <AdminSurface aria-labelledby="whatsapp-templates-heading">
      <AdminSurfaceHeader
        title="Message templates"
        description="Approved WhatsApp Business templates require provider synchronization."
      />
      <AdminSurfaceBody>
        <h3 id="whatsapp-templates-heading" className="sr-only">
          Message templates
        </h3>
        <div className="rounded-2xl border border-dashed border-[var(--admin-border)] bg-[var(--admin-soft)] px-4 py-6 text-sm text-[var(--admin-muted)]">
          <p className="font-semibold text-[var(--admin-ink)]">Message Templates Foundation</p>
          <p className="mt-2">
            Approved WhatsApp Business templates and provider synchronization are required before template messages can
            be sent from this workspace.
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs">
            <li>Template name, language, category, approval status</li>
            <li>Variable mapping and branch scope</li>
            <li>Server-side send within Meta service window policy</li>
          </ul>
        </div>
      </AdminSurfaceBody>
    </AdminSurface>
  );
}
