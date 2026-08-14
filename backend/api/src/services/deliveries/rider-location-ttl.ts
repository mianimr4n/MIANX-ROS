/**
 * Rider location TTL job (ADR-008 §2).
 *
 * Calls the `purge_expired_rider_locations` SQL function on a schedule.
 * The function deletes `rider_locations` rows whose associated delivery
 * reached a terminal state more than `retentionHours` ago (default 24h).
 *
 * Idempotent: safe to run multiple times per day. Each invocation deletes
 * whatever qualifies; running it twice in a row deletes zero additional
 * rows on the second run.
 *
 * Lifecycle: returns null (does NOT run) when:
 *   - NODE_ENV != "production"
 *   - TELEPIZZA_RIDER_LOCATION_TTL_JOB != "1"
 *
 * Authority: ADR-008 §2 (24h retention), §6 (idempotent job)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { ApiError } from "../../common/http.js";
import type { EnvironmentStatus } from "../../config/env.js";
import { defaultLogger as logger } from "../../observability/logger.js";

export interface RiderLocationTtlJobResult {
  deleted: number;
  cutoff: string;
  retentionHours: number;
  ranAt: string;
}

export interface RiderLocationTtlJob {
  runOnce(retentionHours?: number): Promise<RiderLocationTtlJobResult>;
}

function createServiceClient(envStatus: EnvironmentStatus): SupabaseClient {
  if (!envStatus.config.supabaseUrl || !envStatus.config.supabaseServiceRoleKey) {
    throw new ApiError(503, "SUPABASE_NOT_CONFIGURED", "Supabase service role is not configured.");
  }
  return createClient(envStatus.config.supabaseUrl, envStatus.config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createRiderLocationTtlJob(envStatus: EnvironmentStatus): RiderLocationTtlJob {
  const supabase = () => createServiceClient(envStatus);

  return {
    async runOnce(retentionHours = 24) {
      const client = supabase();
      const { data, error } = await client.rpc("purge_expired_rider_locations", {
        p_retention_hours: retentionHours,
      });

      if (error) {
        throw new ApiError(
          500,
          "RIDER_LOCATION_TTL_FAILED",
          `TTL purge RPC failed: ${error.message}`,
        );
      }

      const result = (data ?? {}) as Record<string, unknown>;
      return {
        deleted: Number(result.deleted ?? 0),
        cutoff: String(result.cutoff ?? ""),
        retentionHours: Number(result.retention_hours ?? retentionHours),
        ranAt: String(result.ran_at ?? new Date().toISOString()),
      };
    },
  };
}

/**
 * Lifecycle wrapper. Starts an interval that calls runOnce every
 * `intervalMs` (default: 1 hour). Returns a stop() function or null
 * if the job should not run in the current environment.
 */
export function startRiderLocationTtlJob(envStatus: EnvironmentStatus): (() => void) | null {
  const enabled = process.env.TELEPIZZA_RIDER_LOCATION_TTL_JOB === "1";

  if (!enabled) {
    return null;
  }

  const job = createRiderLocationTtlJob(envStatus);
  const intervalMs = 60 * 60 * 1000; // 1 hour
  const timer = setInterval(async () => {
    try {
      const result = await job.runOnce(24);
      logger.info("rider_location_ttl_job_ran", {
        deleted: result.deleted,
        cutoff: result.cutoff,
      });
    } catch (err) {
      logger.error("rider_location_ttl_job_error", { error: String(err) });
    }
  }, intervalMs);

  // Don't keep the Node.js process alive just for this timer.
  if (typeof timer.unref === "function") timer.unref();

  return () => clearInterval(timer);
}
