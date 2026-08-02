import {
  COMMAND_MODE_DEFINITIONS,
  COMMAND_MODE_ORDER,
  type CommandModeId,
} from "./types";

const TOKEN_TO_MODE: Record<string, CommandModeId> = {
  "pre-open": "PRE_OPEN",
  pre_open: "PRE_OPEN",
  preopen: "PRE_OPEN",
  live: "LIVE_OPERATIONS",
  "live-operations": "LIVE_OPERATIONS",
  live_operations: "LIVE_OPERATIONS",
  closing: "CLOSING",
  close: "CLOSING",
};

/** Sanitize `commandMode` query values. Invalid → null (use suggestion). */
export function parseCommandModeParam(raw: string | null | undefined): CommandModeId | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  if (!value || value.length > 40) return null;
  if (/[@]|phone|token|password|email/i.test(value)) return null;
  return TOKEN_TO_MODE[value] ?? null;
}

export function commandModeToParam(mode: CommandModeId): string {
  return COMMAND_MODE_DEFINITIONS[mode].urlToken;
}

export function isValidCommandModeId(value: string): value is CommandModeId {
  return (COMMAND_MODE_ORDER as string[]).includes(value);
}

/**
 * Read/write helpers for dashboard URL state.
 * Only touches `commandMode`; never invents branchId or PII keys.
 */
export function readCommandModeFromSearch(search: string): CommandModeId | null {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(qs);
  return parseCommandModeParam(params.get("commandMode"));
}

export function writeCommandModeSearch(
  search: string,
  mode: CommandModeId | null,
): string {
  const qs = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(qs);
  if (mode) params.set("commandMode", commandModeToParam(mode));
  else params.delete("commandMode");
  const next = params.toString();
  return next ? `?${next}` : "";
}
