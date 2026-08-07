import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/AuthContext";
import {
  bootstrapOrganizationOwner,
  createIdentityStaffInvite,
  listAdminStaffInvites,
  resendIdentityStaffInvite,
  revokeIdentityStaffInvite,
  updateIdentityStaffAssignment,
  type AdminStaffInvite,
} from "@/lib/admin-api";
import { ApiRequestError } from "@/lib/api";
import { fetchBranches } from "@/lib/telepizza-api";
import type { Branch } from "@/lib/telepizza-types";

const OWNER_ROLES = ["finance", "hr", "auditor", "branch_manager", "kitchen_manager", "cashier", "rider", "support"];
const MANAGER_ROLES = ["kitchen_manager", "cashier", "rider", "support"];
const BRANCH_ROLES = new Set(["branch_manager", "kitchen_manager", "cashier", "rider", "support"]);

export function IdentityInvitationsPanel() {
  const { session, isPlatformSuperAdmin, ownedOrganizationIds, organizationIds, roles, branchIds } = useAuth();
  const isOwner = ownedOrganizationIds.length > 0;
  const isManager = roles.includes("branch_manager") || roles.includes("branch-manager");
  const visible = isPlatformSuperAdmin || isOwner || isManager;
  const [organizationId, setOrganizationId] = useState(ownedOrganizationIds[0] ?? organizationIds[0] ?? "");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [roleCode, setRoleCode] = useState(isPlatformSuperAdmin ? "organization_owner" : isManager ? "cashier" : "branch_manager");
  const [selectedBranches, setSelectedBranches] = useState<string[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [invites, setInvites] = useState<AdminStaffInvite[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminStaffInvite | null>(null);
  const [editRole, setEditRole] = useState("cashier");
  const [editBranches, setEditBranches] = useState<string[]>([]);
  const token = session?.access_token;
  const rolesAvailable = isPlatformSuperAdmin ? ["organization_owner"] : isManager ? MANAGER_ROLES : OWNER_ROLES;
  const scopedBranches = useMemo(() => isManager ? branches.filter((b) => branchIds.includes(b.id)) : branches, [branchIds, branches, isManager]);

  const load = async () => {
    if (!token || !organizationId || !visible) return;
    try { setInvites(await listAdminStaffInvites(token, { organizationId })); }
    catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : "Unable to load invitations."); }
  };

  useEffect(() => { if (visible) void fetchBranches().then(setBranches).catch(() => setBranches([])); }, [visible]);
  useEffect(() => { void load(); }, [organizationId, token, visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (!token) return; setBusy(true); setError(null); setNotice(null);
    try {
      const correlationId = crypto.randomUUID();
      if (isPlatformSuperAdmin) await bootstrapOrganizationOwner(token, { organizationId, email, fullName, correlationId });
      else await createIdentityStaffInvite(token, { organizationId, email, fullName, roleCode, branchIds: BRANCH_ROLES.has(roleCode) ? selectedBranches : [], correlationId });
      setEmail(""); setFullName(""); setSelectedBranches([]); setNotice("Invitation recorded and delivered without exposing its token."); await load();
    } catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : "Invitation failed."); }
    finally { setBusy(false); }
  };

  const act = async (kind: "resend" | "revoke", id: string) => {
    if (!token) return; setBusy(true); setError(null); setNotice(null);
    try { if (kind === "resend") await resendIdentityStaffInvite(token, id); else await revokeIdentityStaffInvite(token, id); setNotice(kind === "resend" ? "A new single-use link was delivered; the previous link is invalid." : "Invitation revoked."); await load(); }
    catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : `Unable to ${kind} invitation.`); }
    finally { setBusy(false); }
  };

  const saveScope = async () => {
    if (!token || !editing?.acceptedRoleAssignmentId) return;
    setBusy(true); setError(null); setNotice(null);
    try {
      await updateIdentityStaffAssignment(token, editing.acceptedRoleAssignmentId, { roleCode: editRole, branchIds: BRANCH_ROLES.has(editRole) ? editBranches : [] });
      setNotice("Accepted staff role and scope updated atomically."); setEditing(null); await load();
    } catch (cause) { setError(cause instanceof ApiRequestError ? cause.message : "Unable to update staff scope."); }
    finally { setBusy(false); }
  };

  return (
    <section className="rounded-xl border bg-card p-5" aria-labelledby="identity-invitations-title">
      <h2 id="identity-invitations-title" className="text-lg font-semibold">Tenant identity invitations</h2>
      <p className="mt-1 text-sm text-muted-foreground">{isPlatformSuperAdmin ? "Bootstrap the first owner only. Platform administrators cannot create restaurant staff." : "Invite staff within your organization and assigned branch authority."}</p>
      <p className="mt-1 text-xs text-muted-foreground">Lifecycle: pending, accepted, expired, or revoked.</p>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={submit}>
        <label className="text-sm">Organization ID<input className="mt-1 w-full rounded-md border bg-background p-2" required value={organizationId} onChange={(e) => setOrganizationId(e.target.value)} readOnly={!isPlatformSuperAdmin} /></label>
        <label className="text-sm">Role<select className="mt-1 w-full rounded-md border bg-background p-2" value={roleCode} onChange={(e) => { setRoleCode(e.target.value); setSelectedBranches([]); }}>{rolesAvailable.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select></label>
        <label className="text-sm">Full name<input className="mt-1 w-full rounded-md border bg-background p-2" required maxLength={150} value={fullName} onChange={(e) => setFullName(e.target.value)} /></label>
        <label className="text-sm">Email<input className="mt-1 w-full rounded-md border bg-background p-2" required type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {!isPlatformSuperAdmin && BRANCH_ROLES.has(roleCode) && <fieldset className="md:col-span-2"><legend className="text-sm font-medium">Assigned branches</legend><div className="mt-2 flex flex-wrap gap-3">{scopedBranches.map((branch) => <label className="flex items-center gap-2 text-sm" key={branch.id}><input type="checkbox" checked={selectedBranches.includes(branch.id)} onChange={(e) => setSelectedBranches((current) => e.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id))} />{branch.name}</label>)}</div></fieldset>}
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50 md:col-span-2" disabled={busy || (BRANCH_ROLES.has(roleCode) && selectedBranches.length === 0)}>{busy ? "Working…" : isPlatformSuperAdmin ? "Invite first owner" : "Send staff invitation"}</button>
      </form>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Person</th><th className="p-2">Role/scope</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr></thead><tbody>{invites.length === 0 ? <tr><td className="p-3 text-muted-foreground" colSpan={4}>No invitations in this organization.</td></tr> : invites.map((invite) => <tr className="border-t" key={invite.id}><td className="p-2"><div>{invite.fullName}</div><div className="text-muted-foreground">{invite.email}</div></td><td className="p-2">{invite.roleCode.replaceAll("_", " ")} · {invite.branchIds.length} branch(es)</td><td className="p-2">{invite.status} / {invite.deliveryStatus}</td><td className="p-2"><div className="flex gap-2">{invite.status === "pending" && <><button type="button" disabled={busy} onClick={() => void act("resend", invite.id)}>Resend</button><button type="button" disabled={busy} onClick={() => void act("revoke", invite.id)}>Revoke</button></>}{!isPlatformSuperAdmin && invite.status === "accepted" && invite.acceptedRoleAssignmentId && <button type="button" disabled={busy} onClick={() => { setEditing(invite); setEditRole(invite.roleCode); setEditBranches(invite.branchIds); }}>Edit role/scope</button>}</div></td></tr>)}</tbody></table></div>
      {editing && <div className="mt-4 rounded-md border p-3"><h3 className="font-medium">Edit {editing.fullName}</h3><div className="mt-2 flex flex-wrap gap-3"><select className="rounded-md border bg-background p-2" value={editRole} onChange={(e) => { setEditRole(e.target.value); setEditBranches([]); }}>{rolesAvailable.filter((role) => role !== "organization_owner").map((role) => <option key={role} value={role}>{role.replaceAll("_", " ")}</option>)}</select>{BRANCH_ROLES.has(editRole) && scopedBranches.map((branch) => <label className="flex items-center gap-2 text-sm" key={branch.id}><input type="checkbox" checked={editBranches.includes(branch.id)} onChange={(e) => setEditBranches((current) => e.target.checked ? [...current, branch.id] : current.filter((id) => id !== branch.id))} />{branch.name}</label>)}</div><div className="mt-3 flex gap-3"><button type="button" disabled={busy || (BRANCH_ROLES.has(editRole) && editBranches.length === 0)} onClick={() => void saveScope()}>Save role/scope</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>Cancel</button></div></div>}
    </section>
  );
}
