export interface EnvironmentIssue {
  key: string;
  message: string;
}

export type TelepizzaEnvClass = "local" | "test" | "staging" | "production";

export type IntegrationMode = "disabled" | "mock" | "sandbox" | "live";

export interface ApiEnvironment {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  envClass: TelepizzaEnvClass;
  emailMode: IntegrationMode;
  whatsappMode: IntegrationMode;
  paymentMode: IntegrationMode;
  webhookMode: IntegrationMode;
  /**
   * AI integration mode (ADR-013 §1 — backend-proxy-only).
   *   - "disabled": AI features refuse to start (503 AI_DISABLED)
   *   - "mock":     returns deterministic stubs; no HTTP to provider
   *   - "sandbox":  same as mock; provider tag = "sandbox"
   *   - "live":     real HTTP call to OpenAI / Anthropic via provider-proxy.ts
   *
   * Local/test defaults to "mock". Staging/production defaults to "disabled"
   * until the operator provisions OPENAI_API_KEY / ANTHROPIC_API_KEY (FU-12).
   */
  aiMode: IntegrationMode;
  /** WhatsApp Cloud API credentials (ADR-003). Secrets NEVER in DB. */
  whatsapp: WhatsAppEnvConfig;
}

/**
 * WhatsApp Cloud API configuration (ADR-003 — Provider-Secret Boundary).
 * All fields are resolved from process.env at startup. The actual access
 * token and app secret are NEVER persisted to the database.
 */
export interface WhatsAppEnvConfig {
  /** Meta Graph API version (e.g. "v21.0"). */
  apiVersion: string;
  /** phone_number_id from the WABA. Non-secret; also stored in whatsapp_provider_configs. */
  phoneNumberId: string;
  /** WABA ID (numeric, as string). Non-secret. */
  businessAccountId: string;
  /** System User access token. SECRET — env var only, NEVER logged or returned by APIs. */
  accessToken: string;
  /** App Secret from Meta App → Settings → Basic. Used for X-Hub-Signature-256 HMAC verification. SECRET. */
  appSecret: string;
  /** Verify token for webhook handshake (any opaque string). SECRET. */
  verifyToken: string;
}

export interface EnvironmentStatus {
  isReady: boolean;
  config: ApiEnvironment;
  issues: EnvironmentIssue[];
  /** Fatal local-dev safety violations — API must refuse to listen when these are present. */
  safetyBlockers: EnvironmentIssue[];
}

const DEFAULT_PORT = 4000;
const DEFAULT_CORS_ORIGIN = "http://localhost:3000";
const ENV_CLASSES = new Set<TelepizzaEnvClass>(["local", "test", "staging", "production"]);
const INTEGRATION_MODES = new Set<IntegrationMode>(["disabled", "mock", "sandbox", "live"]);

function parsePort(value: string | undefined, issues: EnvironmentIssue[]) {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    issues.push({
      key: "PORT",
      message: "PORT must be an integer between 1 and 65535.",
    });
    return DEFAULT_PORT;
  }

  return port;
}

function validateUrl(
  key: "API_CORS_ORIGIN" | "SUPABASE_URL",
  value: string | undefined,
  fallback: string,
  issues: EnvironmentIssue[],
) {
  const resolvedValue = value?.trim() || fallback;

  try {
    new URL(resolvedValue);
  } catch {
    issues.push({
      key,
      message: `${key} must be a valid absolute URL.`,
    });
    return fallback;
  }

  return resolvedValue;
}

function validateRequiredString(
  key: "API_JWT_SECRET" | "SUPABASE_ANON_KEY" | "SUPABASE_SERVICE_ROLE_KEY",
  value: string | undefined,
  issues: EnvironmentIssue[],
) {
  const resolvedValue = value?.trim() || "";

  if (!resolvedValue) {
    issues.push({
      key,
      message: `${key} is required.`,
    });
    return "";
  }

  return resolvedValue;
}

function resolveEnvClass(source: NodeJS.ProcessEnv, issues: EnvironmentIssue[]): TelepizzaEnvClass {
  const raw = (source.TELEPIZZA_ENV ?? source.APP_ENV ?? "").trim().toLowerCase();
  if (raw) {
    if (!ENV_CLASSES.has(raw as TelepizzaEnvClass)) {
      issues.push({
        key: "TELEPIZZA_ENV",
        message: `TELEPIZZA_ENV must be one of local|test|staging|production (got "${raw}").`,
      });
      return source.NODE_ENV === "production" ? "production" : "local";
    }
    return raw as TelepizzaEnvClass;
  }

  // Default: production NODE_ENV → production; otherwise local (safe default for laptop/dev).
  return source.NODE_ENV === "production" ? "production" : "local";
}

function resolveIntegrationMode(
  key: string,
  value: string | undefined,
  fallback: IntegrationMode,
  envClass: TelepizzaEnvClass,
  issues: EnvironmentIssue[],
): IntegrationMode {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) {
    return envClass === "local" || envClass === "test" ? fallback : fallback;
  }
  if (!INTEGRATION_MODES.has(raw as IntegrationMode)) {
    issues.push({
      key,
      message: `${key} must be one of disabled|mock|sandbox|live.`,
    });
    return fallback;
  }
  return raw as IntegrationMode;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function isLoopbackHost(host: string | null): boolean {
  return host === "127.0.0.1" || host === "localhost" || host === "::1";
}

function isCloudSupabaseHost(host: string | null): boolean {
  return Boolean(host && host.endsWith(".supabase.co"));
}

/**
 * Hard safety evaluation for local/test development.
 * Never logs or returns secret values.
 */
export function evaluateLocalSafety(source: NodeJS.ProcessEnv, config: ApiEnvironment): EnvironmentIssue[] {
  const blockers: EnvironmentIssue[] = [];
  const envClass = config.envClass;
  const requireLocal =
    envClass === "local" ||
    envClass === "test" ||
    source.TELEPIZZA_REQUIRE_LOCAL_SUPABASE === "1";

  const host = hostOf(config.supabaseUrl);
  const allowRemote =
    source.TELEPIZZA_ALLOW_REMOTE_SUPABASE === "1" &&
    (envClass === "staging" || envClass === "production");

  if (requireLocal && !allowRemote) {
    if (!host) {
      blockers.push({
        key: "SUPABASE_URL",
        message: "SUPABASE_URL is invalid. Expected local target http://127.0.0.1:54321",
      });
    } else if (isCloudSupabaseHost(host)) {
      blockers.push({
        key: "SUPABASE_URL",
        message:
          "Refusing to start: SUPABASE_URL points at cloud Supabase (*.supabase.co). Expected http://127.0.0.1:54321 for local development. Set TELEPIZZA_ENV=staging|production and TELEPIZZA_ALLOW_REMOTE_SUPABASE=1 only for deliberate non-local environments.",
      });
    } else if (!isLoopbackHost(host)) {
      blockers.push({
        key: "SUPABASE_URL",
        message: `Refusing to start: SUPABASE_URL host "${host}" is not loopback. Expected 127.0.0.1 or localhost for TELEPIZZA_ENV=${envClass}.`,
      });
    }
  }

  const databaseUrl = source.DATABASE_URL?.trim();
  if (databaseUrl && requireLocal && !allowRemote) {
    const dbHost = hostOf(databaseUrl);
    if (dbHost && !isLoopbackHost(dbHost)) {
      blockers.push({
        key: "DATABASE_URL",
        message: `Refusing to start: DATABASE_URL host "${dbHost}" is remote while TELEPIZZA_ENV=${envClass}.`,
      });
    }
  }

  if (envClass === "local" || envClass === "test") {
    for (const [key, mode] of [
      ["TELEPIZZA_EMAIL_MODE", config.emailMode],
      ["TELEPIZZA_WHATSAPP_MODE", config.whatsappMode],
      ["TELEPIZZA_PAYMENT_MODE", config.paymentMode],
      ["TELEPIZZA_WEBHOOK_MODE", config.webhookMode],
      ["TELEPIZZA_AI_MODE", config.aiMode],
    ] as const) {
      if (mode === "live") {
        blockers.push({
          key,
          message: `Refusing to start: ${key}=live is not allowed for TELEPIZZA_ENV=${envClass}. Use disabled|mock|sandbox.`,
        });
      }
    }
  }

  // ADR-003: WhatsApp Cloud API env vars must be set when whatsappMode is sandbox|live.
  // In mock/disabled mode they're optional (mock never calls Meta).
  if (config.whatsappMode === "sandbox" || config.whatsappMode === "live") {
    const required = [
      ["WHATSAPP_ACCESS_TOKEN", config.whatsapp.accessToken],
      ["WHATSAPP_PHONE_NUMBER_ID", config.whatsapp.phoneNumberId],
      ["WHATSAPP_BUSINESS_ACCOUNT_ID", config.whatsapp.businessAccountId],
      ["WHATSAPP_APP_SECRET", config.whatsapp.appSecret],
      ["WHATSAPP_VERIFY_TOKEN", config.whatsapp.verifyToken],
    ] as const;
    for (const [key, value] of required) {
      if (!value) {
        blockers.push({
          key,
          message: `${key} is required when TELEPIZZA_WHATSAPP_MODE=${config.whatsappMode}. Per ADR-003, secrets must be set in environment variables, NEVER in DB.`,
        });
      }
    }
  }

  if (source.TELEPIZZA_ALLOW_REMOTE_SUPABASE === "1" && (envClass === "local" || envClass === "test")) {
    blockers.push({
      key: "TELEPIZZA_ALLOW_REMOTE_SUPABASE",
      message:
        "TELEPIZZA_ALLOW_REMOTE_SUPABASE=1 cannot override local/test. Use TELEPIZZA_ENV=staging|production for remote targets.",
    });
  }

  return blockers;
}

export function getEnvironmentStatus(source: NodeJS.ProcessEnv = process.env): EnvironmentStatus {
  const issues: EnvironmentIssue[] = [];
  const jwtSecret = validateRequiredString("API_JWT_SECRET", source.API_JWT_SECRET, issues);

  if (jwtSecret && jwtSecret.length < 16) {
    issues.push({
      key: "API_JWT_SECRET",
      message: "API_JWT_SECRET must be at least 16 characters long.",
    });
  }

  const envClass = resolveEnvClass(source, issues);
  const localFallbackModes: IntegrationMode =
    envClass === "local" || envClass === "test" ? "mock" : "disabled";

  const config: ApiEnvironment = {
    port: parsePort(source.PORT ?? source.API_PORT, issues),
    corsOrigin: validateUrl(
      "API_CORS_ORIGIN",
      source.API_CORS_ORIGIN ?? source.CORS_ORIGIN,
      DEFAULT_CORS_ORIGIN,
      issues,
    ),
    jwtSecret,
    supabaseUrl: validateUrl("SUPABASE_URL", source.SUPABASE_URL, "http://127.0.0.1:54321", issues),
    supabaseAnonKey: validateRequiredString("SUPABASE_ANON_KEY", source.SUPABASE_ANON_KEY, issues),
    supabaseServiceRoleKey: validateRequiredString(
      "SUPABASE_SERVICE_ROLE_KEY",
      source.SUPABASE_SERVICE_ROLE_KEY,
      issues,
    ),
    envClass,
    emailMode: resolveIntegrationMode(
      "TELEPIZZA_EMAIL_MODE",
      source.TELEPIZZA_EMAIL_MODE,
      envClass === "local" || envClass === "test" ? "mock" : "live",
      envClass,
      issues,
    ),
    whatsappMode: resolveIntegrationMode(
      "TELEPIZZA_WHATSAPP_MODE",
      source.TELEPIZZA_WHATSAPP_MODE,
      localFallbackModes,
      envClass,
      issues,
    ),
    paymentMode: resolveIntegrationMode(
      "TELEPIZZA_PAYMENT_MODE",
      source.TELEPIZZA_PAYMENT_MODE,
      localFallbackModes,
      envClass,
      issues,
    ),
    webhookMode: resolveIntegrationMode(
      "TELEPIZZA_WEBHOOK_MODE",
      source.TELEPIZZA_WEBHOOK_MODE,
      localFallbackModes,
      envClass,
      issues,
    ),
    aiMode: resolveIntegrationMode(
      "TELEPIZZA_AI_MODE",
      source.TELEPIZZA_AI_MODE,
      envClass === "local" || envClass === "test" ? "mock" : "disabled",
      envClass,
      issues,
    ),
    whatsapp: {
      apiVersion: (source.WHATSAPP_API_VERSION ?? "v21.0").trim() || "v21.0",
      phoneNumberId: (source.WHATSAPP_PHONE_NUMBER_ID ?? "").trim(),
      businessAccountId: (source.WHATSAPP_BUSINESS_ACCOUNT_ID ?? "").trim(),
      accessToken: (source.WHATSAPP_ACCESS_TOKEN ?? "").trim(),
      appSecret: (source.WHATSAPP_APP_SECRET ?? "").trim(),
      verifyToken: (source.WHATSAPP_VERIFY_TOKEN ?? "").trim(),
    },
  };

  const inviteSmtpUrl = source.EMAIL_SMTP_URL?.trim() ?? "";
  if (envClass === "production" && config.emailMode === "live") {
    if (!inviteSmtpUrl) {
      issues.push({ key: "EMAIL_SMTP_URL", message: "EMAIL_SMTP_URL is required for Production staff invitation delivery." });
    } else {
      try {
        const smtp = new URL(inviteSmtpUrl);
        if (smtp.protocol !== "smtps:") issues.push({ key: "EMAIL_SMTP_URL", message: "Production staff invitation SMTP must use smtps:// transport." });
      } catch {
        issues.push({ key: "EMAIL_SMTP_URL", message: "EMAIL_SMTP_URL must be a valid SMTP URL." });
      }
    }
  }

  const safetyBlockers = evaluateLocalSafety(source, config);
  for (const blocker of safetyBlockers) {
    issues.push(blocker);
  }

  return {
    isReady: issues.length === 0,
    config,
    issues,
    safetyBlockers,
  };
}
