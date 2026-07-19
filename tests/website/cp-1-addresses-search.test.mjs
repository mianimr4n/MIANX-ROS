import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("CP-1 addresses: cloud sync flag, extended fields, import helpers, no GPS", () => {
  const addresses = read("apps/website/client/src/lib/customer-addresses.ts");
  const addressesApi = read("apps/website/client/src/lib/customer-addresses-api.ts");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");

  assert.match(addresses, /ADDRESSES_CLOUD_SYNC_AVAILABLE = true/);
  assert.match(addresses, /recipientName/);
  assert.match(addresses, /deliveryZone/);
  assert.match(addresses, /preferredBranchId/);
  assert.match(addresses, /hasCompletedAddressImport/);
  assert.match(addresses, /markAddressImportCompleted/);
  assert.match(addresses, /draftToImportPayload/);
  assert.doesNotMatch(addresses, /latitude|longitude|gps|coordinates/i);
  assert.match(addressesApi, /\/me\/addresses/);
  assert.match(addressesApi, /Authorization/);
  assert.match(hub, /ADDRESSES_CLOUD_SYNC_AVAILABLE/);
  assert.match(hub, /fetchCloudAddresses/);
  assert.match(hub, /importCloudAddresses/);
});

test("CP-1 Menu search debounce and address-aware checkout imports", () => {
  const menu = read("apps/website/client/src/pages/Menu.tsx");
  const checkout = read("apps/website/client/src/pages/Checkout.tsx");

  assert.match(menu, /setDebouncedSearch/);
  assert.match(menu, /180/);
  assert.match(menu, /aria-label=["']Search menu(?: items)?["']/);
  assert.match(checkout, /listSavedAddresses/);
});
