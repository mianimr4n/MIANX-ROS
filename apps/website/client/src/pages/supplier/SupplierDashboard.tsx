import { useEffect, useState } from "react";
import { Link } from "wouter";

import { useAuth } from "@/contexts/AuthContext";
import { ApiRequestError, isApiConfigured } from "@/lib/api";
import {
  fetchSupplierPortalDashboard,
  fetchSupplierPortalMe,
} from "@/lib/supplier-portal-api";
import { SupplierShell } from "./SupplierShell";

export default function SupplierDashboard() {
  const { session, permissions, roles } = useAuth();
  const token = session?.access_token;
  const canPortal = roles.includes("supplier") || permissions.includes("supplier.portal") || permissions.includes("supplier.portal.access");
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [dash, setDash] = useState<{
    awaitingResponse: number;
    acceptedOpen: number;
    amendmentRequested: number;
    delayedExpected: number;
  } | null>(null);

  useEffect(() => {
    if (!token || !canPortal || !isApiConfigured) return;
    void (async () => {
      try {
        const me = await fetchSupplierPortalMe(token);
        setName(String(me.context.supplierName));
        setDash(await fetchSupplierPortalDashboard(token));
      } catch (err) {
        setError(err instanceof ApiRequestError ? err.message : "Unable to load dashboard.");
      }
    })();
  }, [token, canPortal]);

  if (!session) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold">Supplier portal</h1>
        <p className="mt-2 text-zinc-600">Sign in with your supplier account to continue.</p>
        <Link href="/supplier/login" className="mt-4 inline-block text-red-700 underline">
          Supplier login
        </Link>
      </main>
    );
  }

  if (!canPortal) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10">
        <h1 className="text-2xl font-semibold">Unauthorized</h1>
        <p className="mt-2 text-zinc-600">You do not have access to the supplier portal.</p>
      </main>
    );
  }

  return (
    <SupplierShell title={name ?? "Supplier dashboard"}>
      {error ? (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
          {error}
        </p>
      ) : null}
      {!dash ? (
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          <li className="rounded-xl border bg-white p-4">
            <p className="text-sm text-zinc-500">Awaiting your response</p>
            <p className="text-2xl font-semibold">{dash.awaitingResponse}</p>
          </li>
          <li className="rounded-xl border bg-white p-4">
            <p className="text-sm text-zinc-500">Accepted open POs</p>
            <p className="text-2xl font-semibold">{dash.acceptedOpen}</p>
          </li>
          <li className="rounded-xl border bg-white p-4">
            <p className="text-sm text-zinc-500">Amendment requests</p>
            <p className="text-2xl font-semibold">{dash.amendmentRequested}</p>
          </li>
          <li className="rounded-xl border bg-white p-4">
            <p className="text-sm text-zinc-500">Delayed expected deliveries</p>
            <p className="text-2xl font-semibold">{dash.delayedExpected}</p>
          </li>
        </ul>
      )}
      {dash && dash.awaitingResponse === 0 ? (
        <p className="mt-4 text-sm text-zinc-600">No purchase orders are awaiting your response.</p>
      ) : null}
      <Link href="/supplier/purchase-orders" className="mt-6 inline-block text-red-700 underline">
        View purchase orders
      </Link>
    </SupplierShell>
  );
}
