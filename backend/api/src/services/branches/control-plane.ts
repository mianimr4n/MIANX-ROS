import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchReadinessReport, BranchReadinessService } from "./readiness.js";

export type ReadinessState = "READY" | "READY_WITH_WARNINGS" | "BLOCKED" | "NOT_CONFIGURED";
export type ReadinessCategory =
  | "BUSINESS_IDENTITY" | "ORDERING" | "POS" | "KITCHEN" | "DELIVERY"
  | "FINANCE" | "STAFF" | "INTEGRATIONS" | "SECURITY";
export type ReadinessCheckState = "PASS" | "FAIL" | "NOT_APPLICABLE" | "UNKNOWN";

export interface ControlPlaneCheck {
  key: string;
  label: string;
  category: ReadinessCategory;
  severity: "BLOCKER" | "WARNING" | "INFO";
  state: ReadinessCheckState;
  source: "LIVE" | "DERIVED" | "UNAVAILABLE";
  explanation: string;
  remediationPath?: string;
}

export interface BranchControlPlaneReadiness {
  branchId: string;
  branchName: string;
  organizationId: string;
  readinessState: ReadinessState;
  readinessScore: number;
  totalChecks: number;
  passedChecks: number;
  warningChecks: number;
  blockingChecks: number;
  lastEvaluatedAt: string;
  activeConfigurationVersion: { versionId: string; revision: number; activatedAt: string } | null;
  groups: Array<{ category: ReadinessCategory; checks: ControlPlaneCheck[] }>;
  recommendedActions: Array<{ checkKey: string; label: string; remediationPath?: string }>;
}

type LegacyReadinessInput = Pick<BranchReadinessReport, "operationallyActive"> & {
  checks: Pick<BranchReadinessReport["checks"],
    "menuAssigned" | "paymentConfigured" | "kdsReady" | "deliveryReady" | "branchManagerAssigned">;
};

type BranchRow = {
  id: string; name: string; branch_code: string; organization_id: string;
  status: string; address: string | null; timezone: string | null; phone: string | null;
  opening_hours: Record<string, unknown> | null;
};

const ALLOWED_READ_ROLES = new Set(["platform_super_admin", "super-admin", "organization_owner", "branch_manager", "branch-manager"]);
const CATEGORY_ORDER: ReadinessCategory[] = [
  "BUSINESS_IDENTITY", "ORDERING", "POS", "KITCHEN", "DELIVERY",
  "FINANCE", "STAFF", "INTEGRATIONS", "SECURITY",
];

export function assertControlPlaneReadAccess(principal: AuthPrincipal): void {
  if (!principal.isSuperAdmin && !principal.roles.some((role) => ALLOWED_READ_ROLES.has(role))) {
    throw new ApiError(403, "READINESS_ACCESS_DENIED", "Branch readiness access denied.");
  }
}

function check(input: ControlPlaneCheck): ControlPlaneCheck { return input; }

function booleanCheck(input: Omit<ControlPlaneCheck, "state" | "source" | "explanation"> & { value: boolean; pass: string; fail: string }): ControlPlaneCheck {
  const { value, pass, fail, ...metadata } = input;
  return check({ ...metadata, state: value ? "PASS" : "FAIL", source: "LIVE",
    explanation: value ? pass : fail });
}

export function deriveControlPlaneReadiness(
  branch: BranchRow,
  legacy: LegacyReadinessInput,
  configuration: { schemaCount: number; requiredSchemaCount: number; activeCount: number;
    activeVersion: { versionId: string; revision: number; activatedAt: string } | null },
  evaluatedAt = new Date().toISOString(),
): BranchControlPlaneReadiness {
  const hoursConfigured = Boolean(branch.opening_hours && Object.keys(branch.opening_hours).length > 0);
  const checks: ControlPlaneCheck[] = [
    booleanCheck({ key: "branch.active", label: "Branch is operationally active", category: "BUSINESS_IDENTITY",
      severity: "BLOCKER", value: legacy.operationallyActive, pass: "The live branch status is operational.",
      fail: "The live branch status is not operational.", remediationPath: "/admin/settings" }),
    booleanCheck({ key: "branch.name", label: "Branch name", category: "BUSINESS_IDENTITY", severity: "BLOCKER",
      value: branch.name.trim().length > 0, pass: "A live branch name is configured.", fail: "The branch name is missing.", remediationPath: "/admin/settings" }),
    booleanCheck({ key: "branch.address", label: "Branch address", category: "BUSINESS_IDENTITY", severity: "BLOCKER",
      value: Boolean(branch.address?.trim()), pass: "A live branch address is configured.", fail: "The branch address is missing.", remediationPath: "/admin/settings" }),
    booleanCheck({ key: "branch.timezone", label: "Branch timezone", category: "BUSINESS_IDENTITY", severity: "BLOCKER",
      value: Boolean(branch.timezone?.trim()), pass: "A live IANA timezone is configured.", fail: "The branch timezone is missing.", remediationPath: "/admin/settings" }),
    check({ key: "branch.currency", label: "Operational currency", category: "BUSINESS_IDENTITY", severity: "INFO",
      state: "UNKNOWN", source: "UNAVAILABLE", explanation: "No branch currency contract is available in the current branch schema." }),
    booleanCheck({ key: "ordering.hours", label: "Business hours", category: "ORDERING", severity: "BLOCKER",
      value: hoursConfigured, pass: "Live opening hours are configured.", fail: "Opening hours are missing.", remediationPath: "/admin/settings" }),
    booleanCheck({ key: "ordering.menu", label: "Sellable menu", category: "ORDERING", severity: "BLOCKER",
      value: legacy.checks.menuAssigned, pass: "The live catalog contains sellable items.", fail: "No sellable menu items are available.", remediationPath: "/admin/menu" }),
    booleanCheck({ key: "pos.payment", label: "Payment configuration", category: "POS", severity: "WARNING",
      value: legacy.checks.paymentConfigured, pass: "Live payment configuration passed existing probes.",
      fail: "Payment configuration is incomplete.", remediationPath: "/admin/settings" }),
    booleanCheck({ key: "kitchen.workflow", label: "Kitchen workflow", category: "KITCHEN", severity: "WARNING",
      value: legacy.checks.kdsReady, pass: "Existing live KDS probes passed.", fail: "Kitchen workflow readiness is incomplete.", remediationPath: "/admin/kitchen" }),
    check({ key: "delivery.conditional", label: "Delivery dependencies", category: "DELIVERY", severity: "WARNING",
      state: legacy.checks.deliveryReady ? "PASS" : "UNKNOWN", source: legacy.checks.deliveryReady ? "DERIVED" : "UNAVAILABLE",
      explanation: legacy.checks.deliveryReady ? "Existing live delivery probes passed." : "Delivery enablement cannot be proven, so optional delivery does not block launch.",
      remediationPath: "/admin/settings" }),
    booleanCheck({ key: "finance.tax", label: "Finance dependencies", category: "FINANCE", severity: "WARNING",
      value: legacy.checks.paymentConfigured, pass: "Current supported payment/finance dependencies passed.",
      fail: "Current payment/finance dependencies need review.", remediationPath: "/admin/finance" }),
    booleanCheck({ key: "staff.manager", label: "Operational branch manager", category: "STAFF", severity: "BLOCKER",
      value: legacy.checks.branchManagerAssigned, pass: "An assigned branch manager was found.",
      fail: "No assigned branch manager was found.", remediationPath: "/admin/hr" }),
    check({ key: "integrations.enabled", label: "Enabled integrations", category: "INTEGRATIONS", severity: "INFO",
      state: "NOT_APPLICABLE", source: "DERIVED", explanation: "No required enabled integration is declared by the current configuration contract." }),
    booleanCheck({ key: "security.organization_scope", label: "Organization scope", category: "SECURITY", severity: "BLOCKER",
      value: Boolean(branch.organization_id), pass: "The branch has a repository-backed organization scope.",
      fail: "The branch has no organization scope." }),
  ];

  const applicable = checks.filter((item) => item.state !== "NOT_APPLICABLE");
  const passedChecks = applicable.filter((item) => item.state === "PASS").length;
  const blockingChecks = applicable.filter((item) => item.severity === "BLOCKER" && item.state !== "PASS").length;
  const warningChecks = applicable.filter((item) => item.severity === "WARNING" && item.state !== "PASS").length;
  const readinessScore = applicable.length === 0 ? 0 : Math.round((passedChecks / applicable.length) * 100);
  const readinessState: ReadinessState = configuration.schemaCount === 0 ||
      (configuration.requiredSchemaCount > 0 && configuration.activeCount === 0)
    ? "NOT_CONFIGURED"
    : blockingChecks > 0 ? "BLOCKED" : warningChecks > 0 ? "READY_WITH_WARNINGS" : "READY";

  return {
    branchId: branch.id, branchName: branch.name, organizationId: branch.organization_id,
    readinessState, readinessScore, totalChecks: applicable.length, passedChecks, warningChecks,
    blockingChecks, lastEvaluatedAt: evaluatedAt, activeConfigurationVersion: configuration.activeVersion,
    groups: CATEGORY_ORDER.map((category) => ({ category, checks: checks.filter((item) => item.category === category) })),
    recommendedActions: checks.filter((item) => item.state === "FAIL" || item.state === "UNKNOWN")
      .map((item) => ({ checkKey: item.key, label: item.explanation, remediationPath: item.remediationPath })),
  };
}

export interface BranchControlPlaneService {
  list(principal: AuthPrincipal): Promise<BranchControlPlaneReadiness[]>;
  detail(principal: AuthPrincipal, branchId: string): Promise<BranchControlPlaneReadiness>;
}

export function createBranchControlPlaneService(
  envStatus: EnvironmentStatus,
  legacy: BranchReadinessService,
  clientFactory?: () => SupabaseClient,
): BranchControlPlaneService {
  const client = () => clientFactory?.() ?? createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey,
    { auth: { persistSession: false, autoRefreshToken: false } });
  const loadBranches = async (principal: AuthPrincipal, branchId?: string) => {
    assertControlPlaneReadAccess(principal);
    let query = client().from("branches").select("id,name,branch_code,organization_id,status,address,timezone,phone,opening_hours");
    if (branchId) query = query.eq("id", branchId);
    if (!principal.isSuperAdmin) {
      const owned = principal.ownedOrganizationIds ?? [];
      if (owned.length > 0) query = query.in("organization_id", owned);
      else if (principal.branchIds.length > 0) query = query.in("id", principal.branchIds);
      else throw new ApiError(403, "READINESS_ACCESS_DENIED", "Branch readiness access denied.");
    }
    const { data, error } = await query.order("name", { ascending: true });
    if (error) throw new ApiError(500, "BRANCH_READINESS_READ_FAILED", error.message);
    if (branchId && (data ?? []).length === 0) {
      const exists = await client().from("branches").select("id").eq("id", branchId).maybeSingle();
      if (exists.error) throw new ApiError(500, "BRANCH_READ_FAILED", exists.error.message);
      if (exists.data) throw new ApiError(403, "BRANCH_ACCESS_DENIED", "Branch access denied.");
      throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch was not found.");
    }
    return (data ?? []) as BranchRow[];
  };
  const evaluate = async (principal: AuthPrincipal, branch: BranchRow) => {
    const db = client();
    const [legacyReport, schemas, pointers] = await Promise.all([
      legacy.getBranchReadiness({ isSuperAdmin: true, branchIds: [branch.id] }, branch.id),
      db.from("configuration_schemas").select("id,is_required"),
      db.from("configuration_active_versions").select("version_id,revision,activated_at")
        .in("scope_id", [branch.id, branch.organization_id]).order("activated_at", { ascending: false }),
    ]);
    if (schemas.error) throw new ApiError(500, "CONFIGURATION_SCHEMA_READ_FAILED", schemas.error.message);
    if (pointers.error) throw new ApiError(500, "CONFIGURATION_ACTIVE_READ_FAILED", pointers.error.message);
    const active = (pointers.data ?? [])[0] as { version_id: string; revision: number; activated_at: string } | undefined;
    return deriveControlPlaneReadiness(branch, legacyReport, {
      schemaCount: schemas.data?.length ?? 0,
      requiredSchemaCount: (schemas.data ?? []).filter((row) => row.is_required).length,
      activeCount: pointers.data?.length ?? 0,
      activeVersion: active ? { versionId: active.version_id, revision: active.revision, activatedAt: active.activated_at } : null,
    });
  };
  return {
    async list(principal) { return Promise.all((await loadBranches(principal)).map((branch) => evaluate(principal, branch))); },
    async detail(principal, branchId) { return evaluate(principal, (await loadBranches(principal, branchId))[0]); },
  };
}
