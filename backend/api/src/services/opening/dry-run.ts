import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import type { AuthPrincipal } from "../auth/principal.js";
import type { BranchActorScope } from "../tables/management.js";
import { assertBranchMembership } from "../branches/operational-status.js";

export const ROYAL_ORCHARD_SEED_ROLES = [
  { roleCode: "super-admin", email: "mian.imr4n@gmail.com", label: "Founder (super-admin)" },
  { roleCode: "branch-manager", email: "bm.royalorchard.local@telepizza.test", label: "Branch Manager" },
  { roleCode: "kitchen", email: "kitchen.royalorchard.local@telepizza.test", label: "Kitchen" },
  { roleCode: "cashier", email: "cashier.royalorchard.local@telepizza.test", label: "Cashier" },
  { roleCode: "rider", email: "rider.royalorchard.local@telepizza.test", label: "Rider" },
  { roleCode: "customer-support", email: "support.royalorchard.local@telepizza.test", label: "Customer Support" },
  { roleCode: "host", email: "host.royalorchard.local@telepizza.test", label: "Host" },
  { roleCode: "waiter", email: "waiter.royalorchard.local@telepizza.test", label: "Waiter" },
] as const;

export type SeedRoleCode = (typeof ROYAL_ORCHARD_SEED_ROLES)[number]["roleCode"];

export const DRY_RUN_STEPS = [
  { code: "FOUNDER_SIGN_IN", order: 1, roleTag: "super-admin" },
  { code: "VERIFY_BRANCH_SETTINGS", order: 2, roleTag: "super-admin" },
  { code: "VERIFY_PAYMENT_CONFIG", order: 3, roleTag: "super-admin" },
  { code: "VERIFY_NOTIFICATION_READY", order: 4, roleTag: "super-admin" },
  { code: "VERIFY_DEVICE_RECORDS", order: 5, roleTag: "super-admin" },
  { code: "INITIATE_STAFF_SEED", order: 6, roleTag: "super-admin" },
  { code: "BM_SIGN_IN", order: 7, roleTag: "branch-manager" },
  { code: "BM_VERIFY_BRANCH_SCOPE", order: 8, roleTag: "branch-manager" },
  { code: "CASHIER_SIGN_IN", order: 9, roleTag: "cashier" },
  { code: "CASHIER_CREATE_TEST_ORDER", order: 10, roleTag: "cashier" },
  { code: "KITCHEN_ACCEPT_TICKET", order: 11, roleTag: "kitchen" },
  { code: "KITCHEN_MARK_READY", order: 12, roleTag: "kitchen" },
  { code: "RIDER_ACCEPT_DELIVERY", order: 13, roleTag: "rider" },
  { code: "RIDER_MARK_COMPLETE", order: 14, roleTag: "rider" },
  { code: "SUPPORT_ORDER_LOOKUP", order: 15, roleTag: "customer-support" },
  { code: "HOST_RESERVATION_FLOW", order: 16, roleTag: "host" },
  { code: "WAITER_TABLE_ASSIGNMENT", order: 17, roleTag: "waiter" },
  { code: "FOUNDER_REVIEW_READINESS", order: 18, roleTag: "super-admin" },
  { code: "FOUNDER_GO_NO_GO", order: 19, roleTag: "super-admin" },
] as const;

export type DryRunStepCode = (typeof DRY_RUN_STEPS)[number]["code"];
export type DryRunDecision = "GO" | "NO_GO" | "REVIEW_REQUIRED" | "NOT_DECIDED";

const FORBIDDEN_ROLE_CODES = new Set([
  "owner",
  "founder",
  "admin",
  "delivery",
  "general-staff",
  "staff",
]);

const DEFAULT_PAYMENT_SNAPSHOT = {
  CASH: { enabled: true, dryRun: true },
  CARD: { enabled: false },
  BANK_TRANSFER: { enabled: false },
  ONLINE_PAYMENT: { enabled: false },
};

const DEFAULT_NOTIFICATION_SNAPSHOT = {
  IN_APP: { enabled: true, mode: "LIVE_LOCAL" },
  EMAIL: { enabled: true, mode: "MOCK_ONLY" },
  SMS: { enabled: true, mode: "MOCK_ONLY" },
  WHATSAPP: { enabled: true, mode: "MOCK_ONLY" },
  PHONE_MANUAL: { enabled: true, mode: "DOCUMENTED" },
};

const DEFAULT_DEVICE_SNAPSHOT = {
  POS_DEVICE: { status: "DOCUMENTED" },
  KDS_DEVICE: { status: "DOCUMENTED" },
  RECEIPT_PRINTER: { status: "DOCUMENTED" },
  CARD_TERMINAL: { status: "NOT_APPLICABLE" },
  RIDER_DEVICE: { status: "DOCUMENTED" },
  PRIMARY_INTERNET: { status: "DOCUMENTED" },
  BACKUP_INTERNET: { status: "DOCUMENTED" },
  UPS_POWER_BACKUP: { status: "DOCUMENTED" },
};

export interface StaffSeedRunRecord {
  id: string;
  branchId: string;
  runStatus: string;
  environmentMode: string;
  productionApplyAuthorized: boolean;
  seedScriptHash: string;
  handoverFileHash: string | null;
  handoverCipherPath: string | null;
  keyFilePathHint: string | null;
  localTestOnly: boolean;
  createdAt: string;
}

export interface LiveConfigSnapshotRecord {
  id: string;
  branchId: string;
  snapshotStatus: string;
  timezone: string;
  operatingHoursStart: string;
  operatingHoursEnd: string;
  serviceModes: unknown;
  paymentMethods: unknown;
  notificationChannels: unknown;
  deviceRecords: unknown;
  localTestOnly: boolean;
  snapshotHash: string;
  capturedAt: string;
}

export interface DryRunSessionRecord {
  id: string;
  branchId: string;
  sessionStatus: string;
  result: string;
  simulatedOrderId: string | null;
  simulatedTicketId: string | null;
  simulatedDeliveryId: string | null;
  readinessPercentage: number | null;
  localTestOnly: boolean;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface DryRunEvidenceRecord {
  id: string;
  dryRunId: string;
  branchId: string;
  evidenceHash: string;
  decision: DryRunDecision;
  decidedAt: string;
  readinessPercentage: number | null;
  logHash: string;
  localTestOnly: boolean;
  northernBypassUnchanged: boolean;
  branchStatusUnchanged: boolean;
  createdAt: string;
}

export interface OpeningDryRunService {
  listStaffSeedRuns(scope: BranchActorScope, branchId: string): Promise<StaffSeedRunRecord[]>;
  simulateLocalStaffSeed(
    actor: AuthPrincipal,
    input: { branchId: string; handoverDir: string; keyDir: string; notes?: string | null },
  ): Promise<{
    run: StaffSeedRunRecord;
    accountCount: number;
    handoverCipherPath: string;
    keyFilePath: string;
    passwordsReturned: false;
  }>;
  requestProductionSeedAuthorization(
    actor: AuthPrincipal,
    seedRunId: string,
  ): Promise<StaffSeedRunRecord>;
  recordFirstLogin(actor: AuthPrincipal, seedAccountId: string): Promise<void>;
  recordPasswordChanged(actor: AuthPrincipal, seedAccountId: string): Promise<void>;
  captureLiveConfigSnapshot(
    actor: AuthPrincipal,
    input: { branchId: string; notes?: string | null },
  ): Promise<LiveConfigSnapshotRecord>;
  listLiveConfigSnapshots(scope: BranchActorScope, branchId: string): Promise<LiveConfigSnapshotRecord[]>;
  startDryRun(
    actor: AuthPrincipal,
    input: { branchId: string; seedRunId?: string | null; liveConfigSnapshotId?: string | null },
  ): Promise<DryRunSessionRecord>;
  recordDryRunStep(
    actor: AuthPrincipal,
    dryRunId: string,
    input: {
      stepCode: DryRunStepCode;
      stepStatus: "PASSED" | "FAILED" | "SKIPPED";
      evidenceSummary?: string | null;
      screenshotHash?: string | null;
    },
  ): Promise<DryRunSessionRecord>;
  completeDryRunSimulation(
    actor: AuthPrincipal,
    dryRunId: string,
    input?: { readinessPercentage?: number | null },
  ): Promise<DryRunSessionRecord>;
  recordDryRunFounderDecision(
    actor: AuthPrincipal,
    dryRunId: string,
    input: { decision: Exclude<DryRunDecision, "NOT_DECIDED">; notes?: string | null },
  ): Promise<DryRunEvidenceRecord>;
  listDryRuns(scope: BranchActorScope, branchId: string): Promise<DryRunSessionRecord[]>;
  getDryRunEvidence(scope: BranchActorScope, dryRunId: string): Promise<DryRunEvidenceRecord | null>;
}

/** Cryptographically strong temp password — never log the return value. */
export function generateSecureTempPassword(length = 20): string {
  if (length < 16) throw new Error("Temp password length must be >= 16");
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnopqrstuvwxyz";
  const digits = "23456789";
  const symbols = "!@#$%^&*-_=+";
  const all = upper + lower + digits + symbols;
  const pick = (alphabet: string) => alphabet[randomBytes(1)[0]! % alphabet.length]!;
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomBytes(1)[0]! % (i + 1);
    const tmp = chars[i]!;
    chars[i] = chars[j]!;
    chars[j] = tmp;
  }
  return chars.join("");
}

export function fingerprintPassword(password: string): string {
  return createHash("sha256").update(password, "utf8").digest("hex");
}

export function hashPayload(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export interface EncryptedHandoverPackage {
  version: 1;
  alg: "aes-256-gcm";
  iv: string;
  tag: string;
  ciphertext: string;
  createdAt: string;
  expiresAt: string;
}

export function encryptHandoverPayload(
  payload: unknown,
  key: Buffer,
): EncryptedHandoverPackage {
  if (key.length !== 32) throw new Error("AES-256-GCM key must be 32 bytes");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  return {
    version: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64"),
    createdAt,
    expiresAt,
  };
}

export function decryptHandoverPayload(
  pkg: EncryptedHandoverPackage,
  key: Buffer,
  now = new Date(),
): unknown {
  if (key.length !== 32) throw new Error("AES-256-GCM key must be 32 bytes");
  if (now.getTime() > Date.parse(pkg.expiresAt)) {
    throw new ApiError(410, "HANDOVER_EXPIRED", "Handover package expired.");
  }
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(pkg.iv, "base64"));
  decipher.setAuthTag(Buffer.from(pkg.tag, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(pkg.ciphertext, "base64")),
    decipher.final(),
  ]);
  return JSON.parse(decrypted.toString("utf8"));
}

export function writeEncryptedHandoverFiles(opts: {
  handoverDir: string;
  keyDir: string;
  fileName?: string;
  payload: unknown;
}): { handoverCipherPath: string; keyFilePath: string; handoverFileHash: string; keyFingerprint: string } {
  mkdirSync(opts.handoverDir, { recursive: true });
  mkdirSync(opts.keyDir, { recursive: true });
  const key = randomBytes(32);
  const pkg = encryptHandoverPayload(opts.payload, key);
  const fileName = opts.fileName ?? "royal-orchard-staff.json";
  const handoverCipherPath = join(opts.handoverDir, fileName);
  const keyFilePath = join(opts.keyDir, `${fileName}.key`);
  writeFileSync(handoverCipherPath, JSON.stringify(pkg, null, 2), { encoding: "utf8", mode: 0o600 });
  writeFileSync(keyFilePath, key.toString("base64"), { encoding: "utf8", mode: 0o600 });
  const handoverFileHash = createHash("sha256")
    .update(readFileSync(handoverCipherPath))
    .digest("hex");
  const keyFingerprint = createHash("sha256").update(key).digest("hex");
  return { handoverCipherPath, keyFilePath, handoverFileHash, keyFingerprint };
}

export function loadAndDecryptHandover(handoverCipherPath: string, keyFilePath: string): unknown {
  if (!existsSync(handoverCipherPath) || !existsSync(keyFilePath)) {
    throw new ApiError(404, "HANDOVER_NOT_FOUND", "Handover or key file missing.");
  }
  const pkg = JSON.parse(readFileSync(handoverCipherPath, "utf8")) as EncryptedHandoverPackage;
  const key = Buffer.from(readFileSync(keyFilePath, "utf8").trim(), "base64");
  return decryptHandoverPayload(pkg, key);
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertSuperAdmin(actor: AuthPrincipal): void {
  if (!actor.isSuperAdmin) {
    throw new ApiError(403, "SUPER_ADMIN_REQUIRED", "Only super-admin may perform this action.");
  }
}

function assertCanManage(actor: AuthPrincipal, branchId: string): void {
  if (actor.isSuperAdmin) return;
  const isBm = actor.roles.some((r) => r === "branch-manager");
  if (!isBm) {
    throw new ApiError(403, "FORBIDDEN", "Opening dry-run requires super-admin or branch-manager.");
  }
  if (!actor.branchIds.includes(branchId)) {
    throw new ApiError(403, "CROSS_BRANCH_FORBIDDEN", "Branch-manager may only manage assigned branch.");
  }
}

function mapSeedRun(row: Record<string, unknown>): StaffSeedRunRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    runStatus: String(row.run_status),
    environmentMode: String(row.environment_mode),
    productionApplyAuthorized: Boolean(row.production_apply_authorized),
    seedScriptHash: String(row.seed_script_hash),
    handoverFileHash: (row.handover_file_hash as string | null) ?? null,
    handoverCipherPath: (row.handover_cipher_path as string | null) ?? null,
    keyFilePathHint: (row.key_file_path_hint as string | null) ?? null,
    localTestOnly: Boolean(row.local_test_only),
    createdAt: String(row.created_at),
  };
}

function mapLiveConfig(row: Record<string, unknown>): LiveConfigSnapshotRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    snapshotStatus: String(row.snapshot_status),
    timezone: String(row.timezone),
    operatingHoursStart: String(row.operating_hours_start),
    operatingHoursEnd: String(row.operating_hours_end),
    serviceModes: row.service_modes,
    paymentMethods: row.payment_methods,
    notificationChannels: row.notification_channels,
    deviceRecords: row.device_records,
    localTestOnly: Boolean(row.local_test_only),
    snapshotHash: String(row.snapshot_hash),
    capturedAt: String(row.captured_at),
  };
}

function mapDryRun(row: Record<string, unknown>): DryRunSessionRecord {
  return {
    id: String(row.id),
    branchId: String(row.branch_id),
    sessionStatus: String(row.session_status),
    result: String(row.result),
    simulatedOrderId: (row.simulated_order_id as string | null) ?? null,
    simulatedTicketId: (row.simulated_ticket_id as string | null) ?? null,
    simulatedDeliveryId: (row.simulated_delivery_id as string | null) ?? null,
    readinessPercentage:
      row.readiness_percentage == null ? null : Number(row.readiness_percentage),
    localTestOnly: Boolean(row.local_test_only),
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

function mapEvidence(row: Record<string, unknown>): DryRunEvidenceRecord {
  return {
    id: String(row.id),
    dryRunId: String(row.dry_run_id),
    branchId: String(row.branch_id),
    evidenceHash: String(row.evidence_hash),
    decision: row.decision as DryRunDecision,
    decidedAt: String(row.decided_at),
    readinessPercentage:
      row.readiness_percentage == null ? null : Number(row.readiness_percentage),
    logHash: String(row.log_hash),
    localTestOnly: Boolean(row.local_test_only),
    northernBypassUnchanged: Boolean(row.northern_bypass_unchanged),
    branchStatusUnchanged: Boolean(row.branch_status_unchanged),
    createdAt: String(row.created_at),
  };
}

export function createOpeningDryRunService(envStatus: EnvironmentStatus): OpeningDryRunService {
  return {
    async listStaffSeedRuns(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_staff_seed_runs")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      if (error) throw new ApiError(500, "SEED_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapSeedRun);
    },

    async simulateLocalStaffSeed(actor, input) {
      assertSuperAdmin(actor);
      assertBranchMembership(actor, input.branchId);
      if (!input.handoverDir || input.handoverDir.includes("telepizza-opening-operations-completion")) {
        // Refuse writing secrets into the active git worktree path.
        if (String(input.handoverDir).replace(/\\/g, "/").includes("/worktrees/telepizza-opening")) {
          throw new ApiError(
            400,
            "HANDOVER_PATH_FORBIDDEN",
            "Handover files must be written outside the Git worktree.",
          );
        }
      }
      for (const role of ROYAL_ORCHARD_SEED_ROLES) {
        if (FORBIDDEN_ROLE_CODES.has(role.roleCode)) {
          throw new ApiError(400, "FORBIDDEN_ROLE_CODE", "Canonical roles only.");
        }
      }

      const seedScriptHash = hashPayload({
        roles: ROYAL_ORCHARD_SEED_ROLES.map((r) => ({ email: r.email, roleCode: r.roleCode })),
        version: "opening-m4-staff-seed-v1",
      });

      // Generate passwords in-memory only; never attach to API response.
      const sealedAccounts = ROYAL_ORCHARD_SEED_ROLES.map((role) => {
        const tempPassword = generateSecureTempPassword(20);
        return {
          email: role.email,
          roleCode: role.roleCode,
          label: role.label,
          branch: "royal-orchard",
          tempPassword,
          passwordFingerprint: fingerprintPassword(tempPassword),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        };
      });

      const handoverPayload = {
        branchCode: "royal-orchard",
        branchId: input.branchId,
        accounts: sealedAccounts,
        warning: "LOCAL_SIMULATION_ONLY — Production apply requires explicit Founder authorization.",
      };

      const written = writeEncryptedHandoverFiles({
        handoverDir: input.handoverDir,
        keyDir: input.keyDir,
        payload: {
          ...handoverPayload,
          // Keep passwords only inside encrypted payload file on disk.
          accounts: sealedAccounts,
        },
      });

      // Capture fingerprints before wiping plaintext from memory.
      const fpByEmail = new Map(
        sealedAccounts.map((a) => [
          a.email,
          { passwordFingerprint: a.passwordFingerprint, expiresAt: a.expiresAt },
        ]),
      );

      // Drop plaintext references before any further work.
      for (const account of sealedAccounts) {
        (account as { tempPassword?: string }).tempPassword = undefined;
      }

      const admin = createServiceClient(envStatus);
      const { data: runRow, error: runErr } = await admin
        .from("branch_staff_seed_runs")
        .insert({
          branch_id: input.branchId,
          run_status: "SIMULATED_LOCAL",
          environment_mode: "LOCAL_SIMULATION",
          production_apply_authorized: false,
          seed_script_hash: seedScriptHash,
          handover_file_hash: written.handoverFileHash,
          handover_cipher_path: written.handoverCipherPath,
          key_file_path_hint: written.keyFilePath,
          local_test_only: true,
          notes: input.notes ?? "Local staff seed simulation — passwords sealed outside Git.",
          created_by: actor.userId,
        })
        .select("*")
        .single();
      if (runErr) throw new ApiError(500, "SEED_RUN_CREATE_FAILED", runErr.message);
      const run = mapSeedRun(runRow as Record<string, unknown>);

      const accountInsert = ROYAL_ORCHARD_SEED_ROLES.map((role) => {
        const sealed = fpByEmail.get(role.email);
        if (!sealed) throw new ApiError(500, "SEED_FINGERPRINT_MISSING", "Sealed fingerprint missing.");
        return {
          seed_run_id: run.id,
          branch_id: input.branchId,
          email: role.email,
          canonical_role_code: role.roleCode,
          display_label: role.label,
          password_fingerprint: sealed.passwordFingerprint,
          temp_password_expires_at: sealed.expiresAt,
          account_status: "SEEDED",
        };
      });

      const { error: accErr } = await admin.from("branch_staff_seed_accounts").insert(accountInsert);
      if (accErr) throw new ApiError(500, "SEED_ACCOUNTS_FAILED", accErr.message);

      await admin.from("branch_staff_seed_audit_events").insert({
        seed_run_id: run.id,
        branch_id: input.branchId,
        event_type: "SIMULATED_LOCAL",
        actor_user_id: actor.userId,
        notes: "Staff seed simulated locally; plaintext passwords not returned by API.",
      });

      return {
        run,
        accountCount: ROYAL_ORCHARD_SEED_ROLES.length,
        handoverCipherPath: written.handoverCipherPath,
        keyFilePath: written.keyFilePath,
        passwordsReturned: false as const,
      };
    },

    async requestProductionSeedAuthorization(actor, seedRunId) {
      assertSuperAdmin(actor);
      const admin = createServiceClient(envStatus);
      const { data: row, error } = await admin
        .from("branch_staff_seed_runs")
        .select("*")
        .eq("id", seedRunId)
        .maybeSingle();
      if (error) throw new ApiError(500, "SEED_LOOKUP_FAILED", error.message);
      if (!row) throw new ApiError(404, "SEED_RUN_NOT_FOUND", "Seed run not found.");
      assertBranchMembership(actor, String(row.branch_id));

      // Explicitly block Production apply in this milestone delivery.
      throw new ApiError(
        403,
        "OPENING_M4_PRODUCTION_AUTHORIZATION_BLOCKER",
        "Production staff seeding is blocked until separate Founder Production authorization is recorded outside this delivery.",
      );
    },

    async recordFirstLogin(actor, seedAccountId) {
      const admin = createServiceClient(envStatus);
      const { data: row, error } = await admin
        .from("branch_staff_seed_accounts")
        .select("*")
        .eq("id", seedAccountId)
        .maybeSingle();
      if (error) throw new ApiError(500, "SEED_ACCOUNT_LOOKUP_FAILED", error.message);
      if (!row) throw new ApiError(404, "SEED_ACCOUNT_NOT_FOUND", "Seed account not found.");
      assertCanManage(actor, String(row.branch_id));
      const now = new Date().toISOString();
      const { error: updErr } = await admin
        .from("branch_staff_seed_accounts")
        .update({ first_login_at: now, account_status: "FIRST_LOGIN" })
        .eq("id", seedAccountId);
      if (updErr) throw new ApiError(500, "SEED_FIRST_LOGIN_FAILED", updErr.message);
      await admin.from("branch_staff_seed_audit_events").insert({
        seed_run_id: String(row.seed_run_id),
        seed_account_id: seedAccountId,
        branch_id: String(row.branch_id),
        event_type: "FIRST_LOGIN",
        actor_user_id: actor.userId,
      });
    },

    async recordPasswordChanged(actor, seedAccountId) {
      const admin = createServiceClient(envStatus);
      const { data: row, error } = await admin
        .from("branch_staff_seed_accounts")
        .select("*")
        .eq("id", seedAccountId)
        .maybeSingle();
      if (error) throw new ApiError(500, "SEED_ACCOUNT_LOOKUP_FAILED", error.message);
      if (!row) throw new ApiError(404, "SEED_ACCOUNT_NOT_FOUND", "Seed account not found.");
      assertCanManage(actor, String(row.branch_id));
      const now = new Date().toISOString();
      const { error: updErr } = await admin
        .from("branch_staff_seed_accounts")
        .update({ password_changed_at: now, account_status: "PASSWORD_CHANGED" })
        .eq("id", seedAccountId);
      if (updErr) throw new ApiError(500, "SEED_PASSWORD_CHANGE_FAILED", updErr.message);
      await admin.from("branch_staff_seed_audit_events").insert({
        seed_run_id: String(row.seed_run_id),
        seed_account_id: seedAccountId,
        branch_id: String(row.branch_id),
        event_type: "PASSWORD_CHANGED",
        actor_user_id: actor.userId,
      });
    },

    async captureLiveConfigSnapshot(actor, input) {
      assertCanManage(actor, input.branchId);
      const payload = {
        timezone: "Asia/Karachi",
        operatingHoursStart: "10:00",
        operatingHoursEnd: "02:30",
        serviceModes: ["dine-in", "takeaway", "delivery"],
        branchStatusExpected: "operating",
        northernBypassStatusExpected: "coming-soon",
        paymentMethods: DEFAULT_PAYMENT_SNAPSHOT,
        notificationChannels: DEFAULT_NOTIFICATION_SNAPSHOT,
        deviceRecords: DEFAULT_DEVICE_SNAPSHOT,
      };
      const snapshotHash = hashPayload(payload);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_live_config_snapshots")
        .insert({
          branch_id: input.branchId,
          timezone: payload.timezone,
          operating_hours_start: payload.operatingHoursStart,
          operating_hours_end: payload.operatingHoursEnd,
          service_modes: payload.serviceModes,
          branch_status_expected: payload.branchStatusExpected,
          northern_bypass_status_expected: payload.northernBypassStatusExpected,
          payment_methods: payload.paymentMethods,
          notification_channels: payload.notificationChannels,
          device_records: payload.deviceRecords,
          local_test_only: true,
          captured_by: actor.userId,
          snapshot_hash: snapshotHash,
          notes: input.notes ?? "Local live-config simulation snapshot.",
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "LIVE_CONFIG_CAPTURE_FAILED", error.message);
      return mapLiveConfig(data as Record<string, unknown>);
    },

    async listLiveConfigSnapshots(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_live_config_snapshots")
        .select("*")
        .eq("branch_id", branchId)
        .order("captured_at", { ascending: false });
      if (error) throw new ApiError(500, "LIVE_CONFIG_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapLiveConfig);
    },

    async startDryRun(actor, input) {
      assertCanManage(actor, input.branchId);
      const admin = createServiceClient(envStatus);
      const now = new Date().toISOString();
      const { data, error } = await admin
        .from("branch_dry_run_sessions")
        .insert({
          branch_id: input.branchId,
          session_status: "IN_PROGRESS",
          result: "NOT_ASSESSED",
          facilitator_user_id: actor.userId,
          seed_run_id: input.seedRunId ?? null,
          live_config_snapshot_id: input.liveConfigSnapshotId ?? null,
          local_test_only: true,
          started_at: now,
        })
        .select("*")
        .single();
      if (error) throw new ApiError(500, "DRY_RUN_START_FAILED", error.message);
      const session = mapDryRun(data as Record<string, unknown>);

      const { error: stepErr } = await admin.from("branch_dry_run_steps").insert(
        DRY_RUN_STEPS.map((step) => ({
          dry_run_id: session.id,
          branch_id: input.branchId,
          step_code: step.code,
          step_order: step.order,
          role_tag: step.roleTag,
          step_status: "PENDING",
        })),
      );
      if (stepErr) throw new ApiError(500, "DRY_RUN_STEPS_FAILED", stepErr.message);
      return session;
    },

    async recordDryRunStep(actor, dryRunId, input) {
      const admin = createServiceClient(envStatus);
      const { data: session, error } = await admin
        .from("branch_dry_run_sessions")
        .select("*")
        .eq("id", dryRunId)
        .maybeSingle();
      if (error) throw new ApiError(500, "DRY_RUN_LOOKUP_FAILED", error.message);
      if (!session) throw new ApiError(404, "DRY_RUN_NOT_FOUND", "Dry-run session not found.");
      assertCanManage(actor, String(session.branch_id));

      const now = new Date().toISOString();
      const { error: updErr } = await admin
        .from("branch_dry_run_steps")
        .update({
          step_status: input.stepStatus,
          evidence_summary: input.evidenceSummary ?? null,
          screenshot_hash: input.screenshotHash ?? null,
          actor_user_id: actor.userId,
          completed_at: now,
        })
        .eq("dry_run_id", dryRunId)
        .eq("step_code", input.stepCode);
      if (updErr) throw new ApiError(500, "DRY_RUN_STEP_UPDATE_FAILED", updErr.message);

      if (input.stepCode === "CASHIER_CREATE_TEST_ORDER" && input.stepStatus === "PASSED") {
        await admin
          .from("branch_dry_run_sessions")
          .update({ simulated_order_id: `local-order-${dryRunId.slice(0, 8)}` })
          .eq("id", dryRunId);
      }
      if (input.stepCode === "KITCHEN_ACCEPT_TICKET" && input.stepStatus === "PASSED") {
        await admin
          .from("branch_dry_run_sessions")
          .update({ simulated_ticket_id: `local-ticket-${dryRunId.slice(0, 8)}` })
          .eq("id", dryRunId);
      }
      if (input.stepCode === "RIDER_ACCEPT_DELIVERY" && input.stepStatus === "PASSED") {
        await admin
          .from("branch_dry_run_sessions")
          .update({ simulated_delivery_id: `local-delivery-${dryRunId.slice(0, 8)}` })
          .eq("id", dryRunId);
      }
      if (input.stepStatus === "FAILED") {
        await admin
          .from("branch_dry_run_sessions")
          .update({ session_status: "FAILED", result: "FAIL" })
          .eq("id", dryRunId);
      }

      const { data: refreshed } = await admin
        .from("branch_dry_run_sessions")
        .select("*")
        .eq("id", dryRunId)
        .single();
      return mapDryRun(refreshed as Record<string, unknown>);
    },

    async completeDryRunSimulation(actor, dryRunId, input) {
      const admin = createServiceClient(envStatus);
      const { data: session, error } = await admin
        .from("branch_dry_run_sessions")
        .select("*")
        .eq("id", dryRunId)
        .maybeSingle();
      if (error) throw new ApiError(500, "DRY_RUN_LOOKUP_FAILED", error.message);
      if (!session) throw new ApiError(404, "DRY_RUN_NOT_FOUND", "Dry-run session not found.");
      assertCanManage(actor, String(session.branch_id));

      const { data: steps, error: stepErr } = await admin
        .from("branch_dry_run_steps")
        .select("step_status")
        .eq("dry_run_id", dryRunId);
      if (stepErr) throw new ApiError(500, "DRY_RUN_STEPS_LOOKUP_FAILED", stepErr.message);
      const list = steps ?? [];
      const failed = list.some((s) => s.step_status === "FAILED");
      const pending = list.some((s) => s.step_status === "PENDING");
      if (pending) {
        throw new ApiError(400, "STEPS_INCOMPLETE", "All dry-run steps must be recorded before completion.");
      }
      const now = new Date().toISOString();
      const { data, error: updErr } = await admin
        .from("branch_dry_run_sessions")
        .update({
          session_status: failed ? "FAILED" : "COMPLETED",
          result: failed ? "FAIL" : "PASS",
          readiness_percentage: input?.readinessPercentage ?? null,
          completed_at: now,
          local_test_only: true,
        })
        .eq("id", dryRunId)
        .select("*")
        .single();
      if (updErr) throw new ApiError(500, "DRY_RUN_COMPLETE_FAILED", updErr.message);
      return mapDryRun(data as Record<string, unknown>);
    },

    async recordDryRunFounderDecision(actor, dryRunId, input) {
      assertSuperAdmin(actor);
      const admin = createServiceClient(envStatus);
      const { data: session, error } = await admin
        .from("branch_dry_run_sessions")
        .select("*")
        .eq("id", dryRunId)
        .maybeSingle();
      if (error) throw new ApiError(500, "DRY_RUN_LOOKUP_FAILED", error.message);
      if (!session) throw new ApiError(404, "DRY_RUN_NOT_FOUND", "Dry-run session not found.");
      assertBranchMembership(actor, String(session.branch_id));

      if (input.decision === "NO_GO" && !input.notes?.trim()) {
        throw new ApiError(400, "NOTES_REQUIRED", "NO_GO requires decision notes.");
      }

      const { data: steps } = await admin
        .from("branch_dry_run_steps")
        .select("step_code, step_status, screenshot_hash, evidence_summary, role_tag, completed_at")
        .eq("dry_run_id", dryRunId)
        .order("step_order", { ascending: true });

      const snapshotPayload = {
        decision: input.decision,
        dryRunId,
        branchId: String(session.branch_id),
        localTestOnly: true,
        northernBypassUnchanged: true,
        branchStatusUnchanged: true,
        simulatedOrderId: session.simulated_order_id,
        simulatedTicketId: session.simulated_ticket_id,
        simulatedDeliveryId: session.simulated_delivery_id,
        steps: steps ?? [],
        notes: input.notes ?? null,
        decidedBy: actor.userId,
        decidedAt: new Date().toISOString(),
      };
      const logHash = hashPayload(steps ?? []);
      const screenshotHashes = (steps ?? [])
        .map((s) => s.screenshot_hash)
        .filter((h): h is string => Boolean(h));
      const evidenceHash = hashPayload({ snapshotPayload, logHash, screenshotHashes });

      const { data, error: insErr } = await admin
        .from("branch_dry_run_evidence")
        .insert({
          dry_run_id: dryRunId,
          branch_id: String(session.branch_id),
          evidence_hash: evidenceHash,
          decision: input.decision,
          decided_by: actor.userId,
          readiness_percentage: session.readiness_percentage,
          simulated_order_id: session.simulated_order_id,
          simulated_ticket_id: session.simulated_ticket_id,
          simulated_delivery_id: session.simulated_delivery_id,
          log_hash: logHash,
          screenshot_hashes: screenshotHashes,
          snapshot_payload: snapshotPayload,
          northern_bypass_unchanged: true,
          branch_status_unchanged: true,
          local_test_only: true,
        })
        .select("*")
        .single();
      if (insErr) throw new ApiError(500, "DRY_RUN_EVIDENCE_FAILED", insErr.message);

      // Never mutate branches.status from dry-run decisions.
      return mapEvidence(data as Record<string, unknown>);
    },

    async listDryRuns(scope, branchId) {
      assertBranchMembership(scope, branchId);
      const admin = createServiceClient(envStatus);
      const { data, error } = await admin
        .from("branch_dry_run_sessions")
        .select("*")
        .eq("branch_id", branchId)
        .order("created_at", { ascending: false });
      if (error) throw new ApiError(500, "DRY_RUN_LIST_FAILED", error.message);
      return ((data ?? []) as Record<string, unknown>[]).map(mapDryRun);
    },

    async getDryRunEvidence(scope, dryRunId) {
      const admin = createServiceClient(envStatus);
      const { data: session, error } = await admin
        .from("branch_dry_run_sessions")
        .select("branch_id")
        .eq("id", dryRunId)
        .maybeSingle();
      if (error) throw new ApiError(500, "DRY_RUN_LOOKUP_FAILED", error.message);
      if (!session) throw new ApiError(404, "DRY_RUN_NOT_FOUND", "Dry-run session not found.");
      assertBranchMembership(scope, String(session.branch_id));
      const { data, error: evErr } = await admin
        .from("branch_dry_run_evidence")
        .select("*")
        .eq("dry_run_id", dryRunId)
        .maybeSingle();
      if (evErr) throw new ApiError(500, "DRY_RUN_EVIDENCE_LOOKUP_FAILED", evErr.message);
      return data ? mapEvidence(data as Record<string, unknown>) : null;
    },
  };
}

/** Test helper — compare fingerprints without exposing secrets. */
export function fingerprintsMatch(password: string, fingerprint: string): boolean {
  const left = Buffer.from(fingerprintPassword(password), "hex");
  const right = Buffer.from(fingerprint, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
