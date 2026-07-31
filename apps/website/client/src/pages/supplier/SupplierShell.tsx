import { Link, useLocation } from "wouter";
import type { ReactNode } from "react";

import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { href: "/supplier", label: "Dashboard" },
  { href: "/supplier/purchase-orders", label: "Purchase Orders" },
  { href: "/supplier/documents", label: "Documents" },
  { href: "/supplier/profile", label: "Profile" },
];

export function SupplierShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [location] = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-500">Telepizza Supplier Portal</p>
            <h1 className="text-xl font-semibold">{title}</h1>
          </div>
          <button
            type="button"
            className="rounded-lg border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            onClick={() => void signOut()}
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2" aria-label="Supplier">
          {NAV.map((item) => {
            const active =
              item.href === "/supplier"
                ? location === "/supplier"
                : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                  active ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      <footer className="border-t py-4 text-center text-xs text-zinc-500">
        Powered by Mianx.ai — commercial terms are not negotiated automatically.
      </footer>
    </div>
  );
}
