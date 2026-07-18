import { timingSafeEqual } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import {
  generateSecureQrToken,
  hashQrToken,
  type QrTokenValidator,
  type ValidatedRestaurantTable,
} from "../tables/qr.js";

export type DineInSessionStatus =
  | "open"
  | "ordering"
  | "billed"
  | "paid"
  | "closed"
  | "cancelled";

/**
 * Safe public session shape — never includes public_token_hash or internal session id.
 * `publicToken` is set only when freshly issued (create / first issue); null on attach.
 */
export interface SafePublicDineInSession {
  publicToken: string | null;
  status: DineInSessionStatus;
  guestCount: number | null;
  openedAt: string;
  closedAt: string | null;
  table: {
    tableNumber: string;
    displayName: string | null;
    capacity: number | null;
    floorOrZone: string | null;
  };
  branch: {
    id: string;
    code: string;
    name: string;
    city: string;
  };
}

export interface ResolveDineInSessionInput {
  qrToken: string;
  guestCount?: number | null;
}

export interface DineInSessionsService {
  resolveSession(input: ResolveDineInSessionInput): Promise<SafePublicDineInSession>;
  getSessionByPublicToken(publicToken: string): Promise<SafePublicDineInSession>;
}

type SessionRow = {
  id: string;
  public_token_hash: string | null;
  branch_id: string;
  restaurant_table_id: string;
  status: DineInSessionStatus;
  guest_count: number | null;
  opened_at: string;
  closed_at: string | null;
};

type BranchRow = {
  id: string;
  branch_code: string;
  name: string;
  city: string;
};

type TableRow = {
  id: string;
  table_number: string;
  display_name: string | null;
  capacity: number | null;
  floor_or_zone: string | null;
};

const ACTIVE_STATUSES: DineInSessionStatus[] = ["open", "ordering"];

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "Authentication service is not configured.");
  }

  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Reuse QR crypto helpers for session public tokens (hash-only storage). */
export function hashPublicSessionToken(rawToken: string): string {
  return hashQrToken(rawToken);
}

export function generateSecurePublicSessionToken(): { rawToken: string; tokenHash: string } {
  return generateSecureQrToken();
}

function hashesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function toSafe(
  session: SessionRow,
  table: TableRow,
  branch: BranchRow,
  publicToken: string | null,
): SafePublicDineInSession {
  return {
    publicToken,
    status: session.status,
    guestCount: session.guest_count,
    openedAt: session.opened_at,
    closedAt: session.closed_at,
    table: {
      tableNumber: table.table_number,
      displayName: table.display_name,
      capacity: table.capacity,
      floorOrZone: table.floor_or_zone,
    },
    branch: {
      id: branch.id,
      code: branch.branch_code,
      name: branch.name,
      city: branch.city,
    },
  };
}

export function createDineInSessionsService(
  envStatus: EnvironmentStatus,
  qrTokenValidator: QrTokenValidator,
): DineInSessionsService {
  let client: SupabaseClient | null = null;
  const getClient = () => (client ??= createServiceClient(envStatus));

  async function loadBranch(branchId: string): Promise<BranchRow> {
    const { data, error } = await getClient()
      .from("branches")
      .select("id, branch_code, name, city")
      .eq("id", branchId)
      .maybeSingle();
    if (error) {
      throw new ApiError(500, "BRANCH_LOOKUP_FAILED", error.message);
    }
    if (!data) {
      throw new ApiError(404, "BRANCH_NOT_FOUND", "Branch not found for session.");
    }
    return data as BranchRow;
  }

  async function loadTable(tableId: string): Promise<TableRow> {
    const { data, error } = await getClient()
      .from("restaurant_tables")
      .select("id, table_number, display_name, capacity, floor_or_zone")
      .eq("id", tableId)
      .maybeSingle();
    if (error) {
      throw new ApiError(500, "TABLE_LOOKUP_FAILED", error.message);
    }
    if (!data) {
      throw new ApiError(404, "TABLE_NOT_FOUND", "Restaurant table not found.");
    }
    return data as TableRow;
  }

  async function findActiveSession(tableId: string): Promise<SessionRow | null> {
    const { data, error } = await getClient()
      .from("dine_in_sessions")
      .select(
        "id, public_token_hash, branch_id, restaurant_table_id, status, guest_count, opened_at, closed_at",
      )
      .eq("restaurant_table_id", tableId)
      .in("status", ACTIVE_STATUSES)
      .maybeSingle();
    if (error) {
      throw new ApiError(500, "SESSION_LOOKUP_FAILED", error.message);
    }
    return (data as SessionRow | null) ?? null;
  }

  async function createSession(
    table: ValidatedRestaurantTable,
    guestCount: number | null,
  ): Promise<{ session: SessionRow; rawToken: string }> {
    const { rawToken, tokenHash } = generateSecurePublicSessionToken();
    const { data, error } = await getClient()
      .from("dine_in_sessions")
      .insert({
        public_token_hash: tokenHash,
        branch_id: table.branchId,
        restaurant_table_id: table.id,
        status: "open",
        guest_count: guestCount,
      })
      .select(
        "id, public_token_hash, branch_id, restaurant_table_id, status, guest_count, opened_at, closed_at",
      )
      .single();

    if (error) {
      if (error.code === "23505") {
        throw new ApiError(
          409,
          "SESSION_CONFLICT",
          "An active dine-in session already exists for this table.",
        );
      }
      throw new ApiError(500, "SESSION_CREATE_FAILED", error.message);
    }

    return { session: data as SessionRow, rawToken };
  }

  /** Issue a public token only when the active session has none (hash-only storage). */
  async function issueMissingPublicToken(
    session: SessionRow,
  ): Promise<{ session: SessionRow; rawToken: string | null }> {
    if (session.public_token_hash) {
      return { session, rawToken: null };
    }
    const { rawToken, tokenHash } = generateSecurePublicSessionToken();
    const { data, error } = await getClient()
      .from("dine_in_sessions")
      .update({ public_token_hash: tokenHash })
      .eq("id", session.id)
      .is("public_token_hash", null)
      .select(
        "id, public_token_hash, branch_id, restaurant_table_id, status, guest_count, opened_at, closed_at",
      )
      .maybeSingle();
    if (error) {
      throw new ApiError(500, "SESSION_TOKEN_ISSUE_FAILED", error.message);
    }
    if (!data) {
      // Another request filled the hash — attach without re-exposing raw.
      const refreshed = await findActiveSession(session.restaurant_table_id);
      return { session: refreshed ?? session, rawToken: null };
    }
    return { session: data as SessionRow, rawToken };
  }

  return {
    async resolveSession(input) {
      const table = await qrTokenValidator.validateQrToken(input.qrToken);
      if (!table) {
        throw new ApiError(404, "QR_TOKEN_INVALID", "Table QR token is invalid or inactive.");
      }

      const guestCount =
        typeof input.guestCount === "number" && Number.isInteger(input.guestCount) && input.guestCount > 0
          ? input.guestCount
          : null;

      let session: SessionRow;
      let publicToken: string | null = null;

      const existing = await findActiveSession(table.id);
      if (existing) {
        const ensured = await issueMissingPublicToken(existing);
        session = ensured.session;
        publicToken = ensured.rawToken;
        if (guestCount !== null && session.guest_count == null) {
          const { data, error } = await getClient()
            .from("dine_in_sessions")
            .update({ guest_count: guestCount })
            .eq("id", session.id)
            .select(
              "id, public_token_hash, branch_id, restaurant_table_id, status, guest_count, opened_at, closed_at",
            )
            .single();
          if (error) {
            throw new ApiError(500, "SESSION_UPDATE_FAILED", error.message);
          }
          session = data as SessionRow;
        }
      } else {
        try {
          const created = await createSession(table, guestCount);
          session = created.session;
          publicToken = created.rawToken;
        } catch (err) {
          if (err instanceof ApiError && err.code === "SESSION_CONFLICT") {
            const raced = await findActiveSession(table.id);
            if (!raced) throw err;
            const ensured = await issueMissingPublicToken(raced);
            session = ensured.session;
            publicToken = ensured.rawToken;
          } else {
            throw err;
          }
        }
      }

      const [tableRow, branch] = await Promise.all([
        loadTable(session.restaurant_table_id),
        loadBranch(session.branch_id),
      ]);

      return toSafe(session, tableRow, branch, publicToken);
    },

    async getSessionByPublicToken(publicToken) {
      if (typeof publicToken !== "string" || publicToken.length < 16 || publicToken.length > 512) {
        throw new ApiError(404, "SESSION_NOT_FOUND", "Dine-in session not found.");
      }

      const tokenHash = hashPublicSessionToken(publicToken);
      const { data, error } = await getClient()
        .from("dine_in_sessions")
        .select(
          "id, public_token_hash, branch_id, restaurant_table_id, status, guest_count, opened_at, closed_at",
        )
        .eq("public_token_hash", tokenHash)
        .maybeSingle();

      if (error) {
        throw new ApiError(500, "SESSION_LOOKUP_FAILED", error.message);
      }
      if (!data) {
        throw new ApiError(404, "SESSION_NOT_FOUND", "Dine-in session not found.");
      }

      const session = data as SessionRow;
      if (!session.public_token_hash || !hashesEqual(session.public_token_hash, tokenHash)) {
        throw new ApiError(404, "SESSION_NOT_FOUND", "Dine-in session not found.");
      }

      const [tableRow, branch] = await Promise.all([
        loadTable(session.restaurant_table_id),
        loadBranch(session.branch_id),
      ]);

      // Echo caller-supplied token (they already hold it); never the hash.
      return toSafe(session, tableRow, branch, publicToken);
    },
  };
}
