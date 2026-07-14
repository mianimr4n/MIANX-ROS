const baseUrl = process.argv[2]?.replace(/\/$/, "");

if (!baseUrl) {
  console.error("Usage: node scripts/verify-production-api.mjs <api-base-url>");
  console.error("Example: node scripts/verify-production-api.mjs https://telepizza-api.onrender.com");
  process.exit(1);
}

const checks = [
  { name: "healthz", path: "/healthz", expectOk: true },
  { name: "readyz", path: "/readyz", expectOk: true },
  { name: "branches", path: "/api/v1/branches", expectOk: true },
  { name: "menu_catalog", path: "/api/v1/menu/catalog", expectOk: true },
];

const results = [];

for (const check of checks) {
  const response = await fetch(`${baseUrl}${check.path}`, {
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
    status: response.status,
    ok,
  };

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
console.log(JSON.stringify({ baseUrl, results, passed: failed.length === 0 }, null, 2));

if (failed.length > 0) {
  process.exit(1);
}
