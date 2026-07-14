function normalizeBaseUrl(raw) {
  if (!raw) return null;

  let base = raw.trim().replace(/\/$/, "");

  // Common mistake: passing https://host/api/v1 while paths already include /api/v1
  if (base.endsWith("/api/v1")) {
    base = base.slice(0, -"/api/v1".length);
    console.warn(`Normalized base URL by removing /api/v1 suffix → ${base}`);
  }

  return base;
}

const baseUrl = normalizeBaseUrl(process.argv[2]);

if (!baseUrl) {
  console.error("Usage: node scripts/verify-production-api.mjs <api-host-base-url>");
  console.error("Correct:   node scripts/verify-production-api.mjs https://telepizza-api.onrender.com");
  console.error("Incorrect: node scripts/verify-production-api.mjs https://telepizza-api.onrender.com/api/v1");
  console.error("Incorrect: node scripts/verify-production-api.mjs https://telepizza-api.onrender.com/branches");
  process.exit(1);
}

const checks = [
  { name: "healthz", path: "/healthz", expectOk: true },
  { name: "readyz", path: "/readyz", expectOk: true },
  { name: "meta_modules", path: "/api/v1/meta/modules", expectOk: true },
  { name: "branches", path: "/api/v1/branches", expectOk: true },
  { name: "menu_catalog", path: "/api/v1/menu/catalog", expectOk: true },
];

const results = [];

for (const check of checks) {
  const url = `${baseUrl}${check.path}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  const ok = response.status === 200 && payload?.ok === check.expectOk;
  const summary = {
    name: check.name,
    url,
    status: response.status,
    ok,
  };

  if (response.status === 404) {
    summary.hint =
      check.path.startsWith("/api/v1")
        ? "404 on /api/v1/* usually means wrong host, crashed container, or base URL already included /api/v1."
        : "404 on /healthz or /readyz means the API process is not serving this host.";
  }

  if (check.name === "branches" && Array.isArray(payload?.data)) {
    summary.branchCount = payload.data.length;
  }

  if (check.name === "menu_catalog" && payload?.data?.items) {
    summary.itemCount = payload.data.items.length;
    summary.categoryCount = payload.data.categories?.length ?? 0;
  }

  if (check.name === "readyz" && Array.isArray(payload?.issues)) {
    summary.issueCount = payload.issues.length;
  }

  results.push(summary);
}

const failed = results.filter((result) => !result.ok);
console.log(
  JSON.stringify(
    {
      baseUrl,
      websiteApiBaseUrl: `${baseUrl}/api/v1`,
      results,
      passed: failed.length === 0,
    },
    null,
    2,
  ),
);

if (failed.length > 0) {
  process.exit(1);
}
