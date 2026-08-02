/**
 * Refuse Production / cloud targets for RC5-QA-01 Owner Playwright.
 * Exit 0 = local-safe; Exit 2 = forbidden target detected.
 *
 * Checks process env (D3_E2E_*, VITE_*, SUPABASE_*, TELEPIZZA_PROD_*) and
 * optional URL args.
 */
function classify(raw) {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const forbidden =
      host.endsWith(".supabase.co") ||
      host.endsWith(".onrender.com") ||
      host.endsWith(".vercel.app") ||
      host.includes("telepizza-website") ||
      host.includes("telepizza-api");
    const loopback = host === "127.0.0.1" || host === "localhost";
    return { raw, host, forbidden, loopback };
  } catch {
    return { raw, host: "invalid", forbidden: true, loopback: false };
  }
}

const keys = [
  "D3_E2E_BASE_URL",
  "D3_E2E_API_URL",
  "VITE_API_BASE_URL",
  "VITE_SUPABASE_URL",
  "SUPABASE_URL",
  "PLAYWRIGHT_BASE_URL",
];

const findings = [];
for (const key of keys) {
  const c = classify(process.env[key]);
  if (!c) continue;
  findings.push({ key, ...c });
}

for (const arg of process.argv.slice(2)) {
  const c = classify(arg);
  if (c) findings.push({ key: "argv", ...c });
}

if (process.env.TELEPIZZA_PROD_OWNER_EMAIL || process.env.TELEPIZZA_PROD_OWNER_PASSWORD) {
  console.error(
    JSON.stringify({
      ok: false,
      reason: "TELEPIZZA_PROD_* present — refuse Owner Playwright against Production credentials",
    }),
  );
  process.exit(2);
}

// Allow missing optional keys; only fail when a set URL is non-loopback/forbidden.
const setBad = findings.filter((f) => f.forbidden || (f.raw && !f.loopback));

if (setBad.length > 0) {
  console.error(
    JSON.stringify(
      {
        ok: false,
        reason: "non-local or Production-like E2E target",
        setBad: setBad.map((f) => ({ key: f.key, host: f.host })),
      },
      null,
      2,
    ),
  );
  process.exit(2);
}

console.log(JSON.stringify({ ok: true, checked: findings.length, verdict: "local-only targets" }));
process.exit(0);
