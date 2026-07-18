import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  canAccessDispatch,
  canAccessKitchen,
  canManageOrders,
  isStaffPrincipal,
} from "@/lib/staff-access";

const NAV = [
  { href: "/ops", label: "Dashboard", match: (p: string) => p === "/ops" },
  { href: "/ops/orders", label: "Orders", match: (p: string) => p.startsWith("/ops/orders") },
  { href: "/ops/kitchen", label: "Kitchen", match: (p: string) => p.startsWith("/ops/kitchen") },
  { href: "/ops/dispatch", label: "Dispatch", match: (p: string) => p.startsWith("/ops/dispatch") },
] as const;

export function OpsShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { profile, roles, permissions, isSuperAdmin, signOut, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        Loading staff session…
      </div>
    );
  }

  if (!isAuthenticated || !isStaffPrincipal({ roles, permissions, isSuperAdmin })) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="text-2xl font-semibold">Staff access required</h1>
        <p className="text-zinc-400 text-center max-w-md">
          Customers cannot open Restaurant Ops. Sign in with a staff account.
        </p>
        <Link href="/staff/login" className="rounded-lg bg-red-600 px-5 py-3 font-semibold hover:bg-red-500">
          Staff login
        </Link>
      </div>
    );
  }

  const showOrders = canManageOrders({ permissions, isSuperAdmin });
  const showKitchen = canAccessKitchen({ roles, isSuperAdmin });
  const showDispatch = canAccessDispatch({ permissions, roles, isSuperAdmin });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50">
      <header className="border-b border-zinc-800 bg-zinc-900/80 sticky top-0 z-20 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-red-400">Telepizza Ops</p>
            <p className="font-semibold">{profile?.fullName ?? "Staff"}</p>
            <p className="text-xs text-zinc-400">{roles.join(", ") || "staff"}</p>
          </div>
          <nav className="flex flex-wrap gap-2">
            {NAV.filter((item) => {
              if (item.href === "/ops/orders") return showOrders;
              if (item.href === "/ops/kitchen") return showKitchen;
              if (item.href === "/ops/dispatch") return showDispatch;
              return true;
            }).map((item) => {
              const active = item.match(location);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                    active ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
