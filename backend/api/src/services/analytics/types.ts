/**
 * RC4-2 Analytics & BI — shared types and metric value envelopes.
 * All KPI values are produced server-side; React must only display envelopes.
 */

export const ANALYTICS_TIMEZONE = "Asia/Karachi" as const;

export const ANALYTICS_MODULE_IDS = [
  "executive",
  "sales",
  "finance",
  "product",
  "inventory",
  "procurement",
  "supplier",
  "kitchen",
  "delivery",
  "workforce",
  "payroll",
  "loyalty",
  "marketing",
  "customer",
  "branch_comparison",
  "scheduled_reports",
  "export_csv",
  "export_excel",
  "export_pdf",
  "drill_down",
  "formula_registry",
  "metric_contracts",
  "data_quality",
  "exception_center",
  "owner_bi_workspace",
] as const;

export type AnalyticsModuleId = (typeof ANALYTICS_MODULE_IDS)[number];

export type MetricStatus = "LIVE" | "UNAVAILABLE" | "DEFERRED" | "BLOCKED" | "EMPTY";

export type MetricContract = {
  metricId: string;
  module: AnalyticsModuleId;
  name: string;
  formula: string;
  authoritativeSource: string;
  includedStatuses: string[];
  excludedStatuses: string[];
  timezone: typeof ANALYTICS_TIMEZONE;
  period: string;
  branchScope: "branch" | "organization" | "both";
  organizationScope: boolean;
  freshness: string;
  permissions: string[];
  fallback: {
    mode: "null" | "unavailable" | "zero" | "deferred";
    message: string;
  };
};

export type MetricValue = {
  metricId: string;
  name: string;
  value: number | string | null;
  unit: string | null;
  status: MetricStatus;
  reason: string | null;
  asOf: string;
  periodStart: string;
  periodEnd: string;
  branchId: string | null;
  contractRef: string;
};

export type DrillDownRow = Record<string, string | number | null>;

export type DrillDownResult = {
  metricId: string;
  rows: DrillDownRow[];
  truncated: boolean;
  status: MetricStatus;
  reason: string | null;
};

export type AnalyticsModuleSnapshot = {
  moduleId: AnalyticsModuleId;
  title: string;
  status: MetricStatus;
  reason: string | null;
  metrics: MetricValue[];
  series?: Array<{ key: string; label: string; points: Array<{ t: string; v: number }> }>;
  mixes?: Array<{ key: string; label: string; items: Array<{ label: string; value: number; share: number | null }> }>;
};

export type OwnerBiWorkspace = {
  timezone: typeof ANALYTICS_TIMEZONE;
  generatedAt: string;
  branchId: string | null;
  periodStart: string;
  periodEnd: string;
  modules: AnalyticsModuleSnapshot[];
  registryVersion: string;
  dataQualitySummary: {
    pass: number;
    warn: number;
    fail: number;
    unavailable: number;
  };
  openExceptions: number;
  scheduledReportsActive: number;
  scheduledExecution: "DEFERRED";
};

export type AnalyticsPeriodQuery = {
  startDate: string;
  endDate: string;
  branchId?: string;
};

export type ExportFormat = "csv" | "excel" | "pdf";

export type AnalyticsExportResult = {
  filename: string;
  contentType: string;
  body: Buffer | string;
};
