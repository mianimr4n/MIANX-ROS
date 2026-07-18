import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { isStaffPrincipal } from "@/lib/staff-access";

export default function StaffLogin() {
  const { signIn, isAuthenticated, roles, permissions, isSuperAdmin, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated && isStaffPrincipal({ roles, permissions, isSuperAdmin })) {
      setLocation("/ops");
    }
  }, [isLoading, isAuthenticated, roles, permissions, isSuperAdmin, setLocation]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const result = await signIn({ email, password });
    setBusy(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }
    setLocation("/ops");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-red-400">Telepizza Staff</p>
          <h1 className="text-2xl font-bold">Staff login</h1>
          <p className="text-sm text-zinc-400">Branch managers, kitchen, cashiers, and riders only.</p>
        </div>
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3"
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-xl bg-zinc-800 px-3 py-3"
          />
        </label>
        {message ? <p className="text-sm text-red-300">{message}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full min-h-12 rounded-xl bg-red-600 font-bold hover:bg-red-500 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in to Ops"}
        </button>
        <p className="text-center text-sm text-zinc-500">
          Customer?{" "}
          <Link href="/login" className="text-red-400 underline">
            Use customer login
          </Link>
        </p>
      </form>
    </div>
  );
}
