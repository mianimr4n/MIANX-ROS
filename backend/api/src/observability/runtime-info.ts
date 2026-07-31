import { monitorEventLoopDelay } from "node:perf_hooks";
import type { RuntimeBuildInfo } from "./types.js";

const startedAtMs = Date.now();
const startedAtIso = new Date(startedAtMs).toISOString();

let eventLoopHistogram: ReturnType<typeof monitorEventLoopDelay> | null = null;

try {
  eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
  eventLoopHistogram.enable();
} catch {
  eventLoopHistogram = null;
}

export function resolveGitSha(env: NodeJS.ProcessEnv = process.env): string | null {
  const candidates = [
    env.TELEPIZZA_GIT_SHA,
    env.GIT_COMMIT_SHA,
    env.RENDER_GIT_COMMIT,
    env.VERCEL_GIT_COMMIT_SHA,
    env.GITHUB_SHA,
  ];
  for (const value of candidates) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed.slice(0, 40);
  }
  return null;
}

export function resolvePackageVersion(env: NodeJS.ProcessEnv = process.env): string {
  return env.TELEPIZZA_API_VERSION?.trim() || "0.1.0";
}

export function getEventLoopDelayMs(): number | null {
  if (!eventLoopHistogram) return null;
  // mean is in nanoseconds
  return Math.round((eventLoopHistogram.mean / 1e6) * 1000) / 1000;
}

export function getRuntimeBuildInfo(envClass: string, env: NodeJS.ProcessEnv = process.env): RuntimeBuildInfo {
  const mem = process.memoryUsage();
  return {
    service: "telepizza-api",
    version: resolvePackageVersion(env),
    gitSha: resolveGitSha(env),
    nodeVersion: process.version,
    envClass,
    nodeEnv: env.NODE_ENV || "development",
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rss: mem.rss,
      heapUsed: mem.heapUsed,
      heapTotal: mem.heapTotal,
      external: mem.external,
    },
    eventLoopDelayMs: getEventLoopDelayMs(),
    startedAt: startedAtIso,
  };
}
