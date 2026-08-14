/**
 * Domain event service (ADR-012).
 *
 * Wraps the `domain_events` table and `emit_domain_event` RPC. Provides
 * typed query helpers for cross-domain audit log reads + event emission.
 *
 * Authority: ADR-012 §1 (append-only), §4 (emit via RPC), §6 (branch-scoped)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import { throwMappedDbError } from "../../common/supabase-errors.js";
import type { EnvironmentStatus } from "../../config/env.js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DomainEventDomain =
  | "orders"
  | "deliveries"
  | "whatsapp"
  | "finance"
  | "customers"
  | "kitchen"
  | "inventory"
  | "hr"
  | "marketing"
  | "loyalty"
  | "reservations"
  | "system";

export const DOMAIN_EVENT_DOMAINS: DomainEventDomain[] = [
  "orders", "deliveries", "whatsapp", "finance", "customers",
  "kitchen", "inventory", "hr", "marketing", "loyalty", "reservations", "system",
];

export interface DomainEventRow {
  id: number;
  eventType: string;
  domain: DomainEventDomain;
  entityId: string | null;
  branchId: string | null;
  actorUserId: string | null;
  actorRole: string | null;
  metadata: Record<string, unknown>;
  correlationId: string | null;
  occurredAt: string;
  createdAt: string;
}

export interface EmitEventInput {
  eventType: string;
  domain: DomainEventDomain;
  entityId?: string | null;
  branchId?: string | null;
  actorUserId?: string | null;
  actorRole?: string | null;
  metadata?: Record<string, unknown> | null;
  correlationId?: string | null;
}

export interface ListEventsFilters {
  domain?: DomainEventDomain;
  eventType?: string;
  entityId?: string;
  branchId?: string;
  actorUserId?: string;
  correlationId?: string;
  fromOccurredAt?: string;
  toOccurredAt?: string;
  limit?: number;
  offset?: number;
}

export interface DomainEventService {
  /**
   * Emit a domain event. Calls the SQL RPC `emit_domain_event`.
   * Validates event_type format (`<domain>.<action>` lowercase).
   * Returns the inserted row id.
   */
  emitEvent(input: EmitEventInput): Promise<number>;

  /**
   * List domain events with filters. Branch-scoped.
   */
  listEvents(input: {
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    filters: ListEventsFilters;
  }): Promise<{ rows: DomainEventRow[]; total: number }>;

  /**
   * Get a single event by id.
   */
  getEvent(input: { eventId: number }): Promise<DomainEventRow | null>;

  /**
   * List events for a specific entity (across all event types).
   * Branch-scoped.
   */
  listEventsForEntity(input: {
    domain: DomainEventDomain;
    entityId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
    limit?: number;
  }): Promise<DomainEventRow[]>;

  /**
   * List events with the same correlation_id (a business transaction).
   */
  listEventsByCorrelation(input: {
    correlationId: string;
    actorBranchIds: string[];
    isSuperAdmin: boolean;
  }): Promise<DomainEventRow[]>;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function mapRow(row: Record<string, unknown>): DomainEventRow {
  return {
    id: Number(row.id),
    eventType: String(row.event_type),
    domain: row.domain as DomainEventDomain,
    entityId: (row.entity_id as string | null) ?? null,
    branchId: (row.branch_id as string | null) ?? null,
    actorUserId: (row.actor_user_id as string | null) ?? null,
    actorRole: (row.actor_role as string | null) ?? null,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    correlationId: (row.correlation_id as string | null) ?? null,
    occurredAt: String(row.occurred_at),
    createdAt: String(row.created_at),
  };
}

function validateEventType(eventType: string): void {
  if (!eventType || typeof eventType !== "string") {
    throw new ApiError(400, "INVALID_EVENT", "eventType is required.");
  }
  // Must be `<domain>.<action>` lowercase
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(eventType)) {
    throw new ApiError(
      400,
      "INVALID_EVENT",
      "eventType must be `<domain>.<action>` lowercase (e.g. `order.created`).",
    );
  }
}

export function createDomainEventService(envStatus: EnvironmentStatus): DomainEventService {
  const supabase = () => createServiceClient(envStatus);

  return {
    async emitEvent(input) {
      validateEventType(input.eventType);
      if (!input.domain || !DOMAIN_EVENT_DOMAINS.includes(input.domain)) {
        throw new ApiError(
          400,
          "INVALID_EVENT",
          `domain must be one of: ${DOMAIN_EVENT_DOMAINS.join(", ")}.`,
        );
      }

      const client = supabase();
      const { data, error } = await client.rpc("emit_domain_event", {
        p_event_type: input.eventType,
        p_domain: input.domain,
        p_entity_id: input.entityId ?? null,
        p_branch_id: input.branchId ?? null,
        p_actor_user_id: input.actorUserId ?? null,
        p_actor_role: input.actorRole ?? null,
        p_metadata: input.metadata ?? {},
        p_correlation_id: input.correlationId ?? null,
      });

      if (error) throwMappedDbError("DOMAIN_EVENT_EMIT_FAILED", error);
      return Number(data ?? 0);
    },

    async listEvents({ actorBranchIds, isSuperAdmin, filters }) {
      const cap = Math.min(Math.max(filters.limit ?? 50, 1), 500);
      const offset = Math.max(filters.offset ?? 0, 0);
      const client = supabase();

      let q = client
        .from("domain_events")
        .select("*", { count: "exact" });

      if (!isSuperAdmin) {
        // Branch staff see: events in their branch + events with no branch
        if (actorBranchIds.length === 0) {
          q = q.is("branch_id", null);
        } else {
          q = q.or(`branch_id.is.null,branch_id.in.(${actorBranchIds.join(",")})`);
        }
      }

      if (filters.domain) q = q.eq("domain", filters.domain);
      if (filters.eventType) q = q.eq("event_type", filters.eventType);
      if (filters.entityId) q = q.eq("entity_id", filters.entityId);
      if (filters.branchId) q = q.eq("branch_id", filters.branchId);
      if (filters.actorUserId) q = q.eq("actor_user_id", filters.actorUserId);
      if (filters.correlationId) q = q.eq("correlation_id", filters.correlationId);
      if (filters.fromOccurredAt) q = q.gte("occurred_at", filters.fromOccurredAt);
      if (filters.toOccurredAt) q = q.lte("occurred_at", filters.toOccurredAt);

      q = q
        .order("occurred_at", { ascending: false })
        .range(offset, offset + cap - 1);

      const { data, error, count } = await q;
      if (error) throwMappedDbError("DOMAIN_EVENTS_READ_FAILED", error);

      return {
        rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapRow),
        total: count ?? 0,
      };
    },

    async getEvent({ eventId }) {
      const client = supabase();
      const { data, error } = await client
        .from("domain_events")
        .select("*")
        .eq("id", eventId)
        .maybeSingle();
      if (error) throwMappedDbError("DOMAIN_EVENT_READ_FAILED", error);
      if (!data) return null;
      return mapRow(data as Record<string, unknown>);
    },

    async listEventsForEntity({ domain, entityId, actorBranchIds, isSuperAdmin, limit }) {
      const cap = Math.min(Math.max(limit ?? 100, 1), 500);
      const client = supabase();

      let q = client
        .from("domain_events")
        .select("*")
        .eq("domain", domain)
        .eq("entity_id", entityId);

      if (!isSuperAdmin) {
        if (actorBranchIds.length === 0) {
          q = q.is("branch_id", null);
        } else {
          q = q.or(`branch_id.is.null,branch_id.in.(${actorBranchIds.join(",")})`);
        }
      }

      q = q
        .order("occurred_at", { ascending: false })
        .limit(cap);

      const { data, error } = await q;
      if (error) throwMappedDbError("DOMAIN_EVENTS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow);
    },

    async listEventsByCorrelation({ correlationId, actorBranchIds, isSuperAdmin }) {
      const client = supabase();
      let q = client
        .from("domain_events")
        .select("*")
        .eq("correlation_id", correlationId);

      if (!isSuperAdmin) {
        if (actorBranchIds.length === 0) {
          q = q.is("branch_id", null);
        } else {
          q = q.or(`branch_id.is.null,branch_id.in.(${actorBranchIds.join(",")})`);
        }
      }

      q = q.order("occurred_at", { ascending: true });

      const { data, error } = await q;
      if (error) throwMappedDbError("DOMAIN_EVENTS_READ_FAILED", error);
      return ((data ?? []) as Array<Record<string, unknown>>).map(mapRow);
    },
  };
}
