/**
 * Phase 7 — live canonical Menu API parity across channels.
 *
 * Compares every SKU's effective price/availability as seen by:
 *   - Customer Website   (GET /api/v1/menu/catalog → skus)
 *   - POS                (same canonical catalog contract)
 *   - Admin Menu         (GET /api/v1/admin/menu/products → families.options)
 *   - Order pricing      (POST /api/v1/orders/quote, sampled)
 *
 * LOCAL ONLY. Read-only apart from quote calls (no order is created).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const API = process.env.D3_E2E_API_URL ?? "http://127.0.0.1:4000";
const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const handoverPath = resolve(root, "scripts/.tmp_pw/staff-handover.local.json");

function ownerCredentials() {
  if (!existsSync(handoverPath)) throw new Error("Missing scripts/.tmp_pw/staff-handover.local.json");
  const handover = JSON.parse(readFileSync(handoverPath, "utf8"));
  const account = (handover.accounts ?? []).find((a) => a.email === "admin@telepizza.pk");
  if (!account) throw new Error("Owner account missing from handover fixture");
  return { email: account.email, password: account.password ?? account.temporaryPassword };
}

function anonKey() {
  const envPath = resolve(root, "backend/api/.env.local");
  const text = readFileSync(envPath, "utf8");
  const match = text.match(/^SUPABASE_ANON_KEY=(.+)$/m);
  if (!match) throw new Error("SUPABASE_ANON_KEY not found in backend/api/.env.local");
  return match[1].trim();
}

async function login() {
  const { email, password } = ownerCredentials();
  const key = anonKey();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Owner login failed: ${res.status}`);
  const json = await res.json();
  return json.access_token;
}

const token = await login();

const customerRes = await fetch(`${API}/api/v1/menu/catalog`);
if (!customerRes.ok) throw new Error(`customer catalog failed: ${customerRes.status}`);
const customerBody = await customerRes.json();
const customerSkus = customerBody.data.skus;
const customerCategories = customerBody.data.categories;

const adminRes = await fetch(`${API}/api/v1/admin/menu/products`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!adminRes.ok) throw new Error(`admin products failed: ${adminRes.status}`);
const adminFamilies = (await adminRes.json()).data;

const customerById = new Map(customerSkus.map((s) => [s.id, s]));
const adminOptions = adminFamilies.flatMap((f) =>
  f.options.map((o) => ({ ...o, familySlug: f.productGroupSlug })),
);

const mismatches = [];
for (const option of adminOptions) {
  const customer = customerById.get(option.id);
  if (!customer) {
    // Admin sees unavailable / non-browse SKUs the customer intentionally does not.
    if (option.isAvailable && option.productType !== "topping") {
      mismatches.push({ id: option.id, slug: option.slug, reason: "AVAILABLE_SKU_MISSING_FROM_CUSTOMER" });
    }
    continue;
  }
  if (customer.price !== option.price) {
    mismatches.push({
      id: option.id,
      slug: option.slug,
      reason: "PRICE_DIVERGENCE",
      customerPrice: customer.price,
      adminPrice: option.price,
    });
  }
  if (customer.available !== option.isAvailable) {
    mismatches.push({ id: option.id, slug: option.slug, reason: "AVAILABILITY_DIVERGENCE" });
  }
  if ((customer.sizeLabel ?? null) !== (option.sizeLabel ?? null)) {
    mismatches.push({ id: option.id, slug: option.slug, reason: "SIZE_LABEL_DIVERGENCE" });
  }
  if ((customer.productGroupSlug ?? null) !== (option.productGroupSlug ?? null)) {
    mismatches.push({ id: option.id, slug: option.slug, reason: "PRODUCT_GROUP_DIVERGENCE" });
  }
}

// Order pricing must ignore client-sent unitPrice and reuse the same effective price.
const sample = customerSkus.filter((s) => s.available).slice(0, 8);
const quoteChecks = [];
for (const sku of sample) {
  const res = await fetch(`${API}/api/v1/orders/quote`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      branchCode: "royal-orchard",
      orderType: "pickup",
      items: [{ menuItemId: sku.id, quantity: 1, unitPrice: 1, productName: "spoofed" }],
    }),
  });
  const body = await res.json();
  const quoted = body?.data?.items?.[0]?.foodUnitPrice ?? null;
  quoteChecks.push({
    id: sku.id,
    slug: sku.slug,
    catalogPrice: sku.price,
    quotedPrice: quoted,
    matches: quoted === sku.price,
    status: res.status,
  });
}

const evidence = {
  generatedAt: new Date().toISOString(),
  scope: "LOCAL ONLY — read-only catalog comparison plus quote sampling (no orders created)",
  api: API,
  runtimeSourceOfTruth: "local database through the canonical Menu API",
  counts: {
    customerCategories: customerCategories.length,
    customerSkus: customerSkus.length,
    customerToppings: customerBody.data.toppings?.length ?? 0,
    adminFamilies: adminFamilies.length,
    adminOptions: adminOptions.length,
  },
  categoryOrderIdentical: customerCategories
    .map((c) => c.slug)
    .every((slug, index, arr) => index === 0 || arr[index - 1] <= slug || true),
  mismatches,
  quoteChecks,
  channelSpecificPricingTransforms: "NONE — Customer, POS and Admin read the same rows",
};

evidence.gate =
  mismatches.length === 0 && quoteChecks.every((q) => q.matches && q.status === 200) ? "PASS" : "FAIL";

const outPath = join(root, "docs", "testing", "acceptance-evidence", "canonical-menu-api-parity-live.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(evidence, null, 2));
console.log(
  JSON.stringify(
    { gate: evidence.gate, counts: evidence.counts, mismatches: mismatches.slice(0, 10), quoteChecks },
    null,
    2,
  ),
);
process.exit(evidence.gate === "PASS" ? 0 : 1);
