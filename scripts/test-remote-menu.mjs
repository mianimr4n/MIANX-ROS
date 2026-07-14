import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvFile(path) {
  const content = readFileSync(path, "utf8");
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator);
    let value = trimmed.slice(separator + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const env = loadEnvFile(resolve("apps/website/.env.local"));
const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in apps/website/.env.local");
  process.exit(1);
}

const headers = {
  apikey: key,
  Authorization: `Bearer ${key}`,
};

const [categoriesResponse, itemsResponse] = await Promise.all([
  fetch(`${url}/rest/v1/menu_categories?select=id,name,slug&is_active=eq.true&limit=5`, { headers }),
  fetch(`${url}/rest/v1/menu_items?select=slug,name&is_available=eq.true&limit=5`, { headers }),
]);

const categoriesBody = await categoriesResponse.json();
const itemsBody = await itemsResponse.json();

if (!categoriesResponse.ok) {
  console.error("categories_error", categoriesBody);
  process.exit(1);
}

if (!itemsResponse.ok) {
  console.error("items_error", itemsBody);
  process.exit(1);
}

console.log(
  JSON.stringify({
    ok: true,
    categories: Array.isArray(categoriesBody) ? categoriesBody.length : 0,
    items: Array.isArray(itemsBody) ? itemsBody.length : 0,
    sampleCategory: categoriesBody?.[0]?.name ?? null,
    sampleItem: itemsBody?.[0]?.slug ?? null,
  }),
);
