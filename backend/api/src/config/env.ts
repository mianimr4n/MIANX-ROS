export interface EnvironmentIssue {
  key: string;
  message: string;
}

export interface ApiEnvironment {
  port: number;
  corsOrigin: string;
  jwtSecret: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
}

export interface EnvironmentStatus {
  isReady: boolean;
  config: ApiEnvironment;
  issues: EnvironmentIssue[];
}

const DEFAULT_PORT = 4000;
const DEFAULT_CORS_ORIGIN = "http://localhost:3000";

function parsePort(value: string | undefined, issues: EnvironmentIssue[]) {
  if (!value) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    issues.push({
      key: "API_PORT",
      message: "API_PORT must be an integer between 1 and 65535.",
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

export function getEnvironmentStatus(source: NodeJS.ProcessEnv = process.env): EnvironmentStatus {
  const issues: EnvironmentIssue[] = [];
  const jwtSecret = validateRequiredString("API_JWT_SECRET", source.API_JWT_SECRET, issues);

  if (jwtSecret && jwtSecret.length < 16) {
    issues.push({
      key: "API_JWT_SECRET",
      message: "API_JWT_SECRET must be at least 16 characters long.",
    });
  }

  const config: ApiEnvironment = {
    port: parsePort(source.API_PORT, issues),
    corsOrigin: validateUrl("API_CORS_ORIGIN", source.API_CORS_ORIGIN, DEFAULT_CORS_ORIGIN, issues),
    jwtSecret,
    supabaseUrl: validateUrl("SUPABASE_URL", source.SUPABASE_URL, "http://127.0.0.1:54321", issues),
    supabaseAnonKey: validateRequiredString("SUPABASE_ANON_KEY", source.SUPABASE_ANON_KEY, issues),
    supabaseServiceRoleKey: validateRequiredString(
      "SUPABASE_SERVICE_ROLE_KEY",
      source.SUPABASE_SERVICE_ROLE_KEY,
      issues,
    ),
  };

  return {
    isReady: issues.length === 0,
    config,
    issues,
  };
}
