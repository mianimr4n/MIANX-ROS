import { useState } from "react";

import { AdminSectionTitle } from "@/components/admin/AdminKpiCard";
import type { AdminMenuCategory } from "@/lib/admin-menu-api";

/**
 * Owner category management for the canonical global catalog: create, rename, reorder,
 * activate/deactivate. Every write is server-authorised via `menu.write`.
 */
export function CategoryManager({
  categories,
  canWrite,
  busy,
  error,
  onCreate,
  onUpdate,
}: {
  categories: AdminMenuCategory[];
  canWrite: boolean;
  busy: boolean;
  error: string | null;
  onCreate: (input: { name: string; slug: string; sortOrder: number }) => void;
  onUpdate: (id: string, patch: { name?: string; sortOrder?: number; isActive?: boolean }) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const nextSortOrder = categories.reduce((max, category) => Math.max(max, category.sortOrder), 0) + 10;
  const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim());

  return (
    <section
      aria-label="Category management"
      className="mb-6 rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4"
    >
      <AdminSectionTitle
        eyebrow="Structure"
        title="Categories"
        description="One global category list shared by Customer Website, POS, Kitchen and Reports."
      />

      {categories.length === 0 ? (
        <p className="text-sm text-[var(--admin-muted)]">No categories loaded.</p>
      ) : (
        <ul className="space-y-2">
          {categories.map((category, index) => (
            <li
              key={category.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--admin-border)] px-3 py-2 text-sm"
            >
              {renamingId === category.id ? (
                <>
                  <input
                    value={renameDraft}
                    autoFocus
                    onChange={(event) => setRenameDraft(event.target.value)}
                    className="min-w-40 flex-1 rounded-lg border border-[var(--admin-border)] px-2 py-1.5"
                    aria-label={`Rename ${category.name}`}
                  />
                  <button
                    type="button"
                    disabled={busy || renameDraft.trim().length === 0}
                    onClick={() => {
                      onUpdate(category.id, { name: renameDraft.trim() });
                      setRenamingId(null);
                    }}
                    className="min-h-9 rounded-lg bg-[var(--brand-red)] px-3 text-xs font-semibold text-white disabled:opacity-40"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingId(null)}
                    className="min-h-9 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium">
                    {category.name}
                    <span className="ml-2 text-xs text-[var(--admin-muted)]">
                      {category.slug} · {category.skuCount} SKU{category.skuCount === 1 ? "" : "s"}
                    </span>
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                      category.isActive ? "bg-emerald-50 text-emerald-800" : "bg-[var(--admin-soft)] text-[var(--admin-muted)]"
                    }`}
                  >
                    {category.isActive ? "Active" : "Inactive"}
                  </span>
                  {canWrite ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setRenamingId(category.id);
                          setRenameDraft(category.name);
                        }}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-semibold disabled:opacity-40"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === 0}
                        onClick={() => {
                          const previous = categories[index - 1]!;
                          onUpdate(category.id, { sortOrder: previous.sortOrder });
                          onUpdate(previous.id, { sortOrder: category.sortOrder });
                        }}
                        aria-label={`Move ${category.name} up`}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-semibold disabled:opacity-40"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={busy || index === categories.length - 1}
                        onClick={() => {
                          const next = categories[index + 1]!;
                          onUpdate(category.id, { sortOrder: next.sortOrder });
                          onUpdate(next.id, { sortOrder: category.sortOrder });
                        }}
                        aria-label={`Move ${category.name} down`}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-semibold disabled:opacity-40"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onUpdate(category.id, { isActive: !category.isActive })}
                        className="min-h-9 rounded-lg border border-[var(--admin-border)] px-3 text-xs font-semibold disabled:opacity-40"
                      >
                        {category.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form
          className="mt-4 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!slugValid || name.trim().length === 0) return;
            onCreate({ name: name.trim(), slug: slug.trim(), sortOrder: nextSortOrder });
            setName("");
            setSlug("");
          }}
        >
          <label className="text-xs font-semibold">
            New category name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-52 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-normal"
            />
          </label>
          <label className="text-xs font-semibold">
            Slug
            <input
              value={slug}
              placeholder="signature-pizzas"
              onChange={(event) => setSlug(event.target.value)}
              aria-invalid={slug.length > 0 && !slugValid}
              className="mt-1 block w-52 rounded-lg border border-[var(--admin-border)] px-3 py-2 text-sm font-normal"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !slugValid || name.trim().length === 0}
            className="min-h-11 rounded-xl bg-[var(--brand-red)] px-4 text-sm font-semibold text-white disabled:opacity-40"
          >
            Add category
          </button>
        </form>
      ) : (
        <p className="mt-4 text-xs text-[var(--admin-muted)]">
          Category editing requires the `menu.write` permission.
        </p>
      )}

      {error ? (
        <p className="mt-3 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
