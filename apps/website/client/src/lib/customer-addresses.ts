/** Local saved delivery addresses for Account Center (no server table yet). */

export type SavedCustomerAddress = {
  id: string;
  label: string;
  line1: string;
  area: string;
  city: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type AddressInput = {
  label: string;
  line1: string;
  area?: string;
  city?: string;
  notes?: string;
};

const STORAGE_PREFIX = "telepizza.customer.addresses.";

function storageKey(ownerKey: string): string {
  return `${STORAGE_PREFIX}${ownerKey.trim().toLowerCase()}`;
}

function readRaw(ownerKey: string): SavedCustomerAddress[] {
  if (!ownerKey.trim()) return [];
  try {
    const raw = localStorage.getItem(storageKey(ownerKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedCustomerAddress[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(ownerKey: string, addresses: SavedCustomerAddress[]) {
  localStorage.setItem(storageKey(ownerKey), JSON.stringify(addresses));
}

export function listSavedAddresses(ownerKey: string): SavedCustomerAddress[] {
  return readRaw(ownerKey);
}

export function addSavedAddress(
  ownerKey: string,
  input: AddressInput,
): { ok: true; address: SavedCustomerAddress } | { ok: false; message: string } {
  const label = input.label.trim() || "Home";
  const line1 = input.line1.trim();
  if (!line1) {
    return { ok: false, message: "Enter a street address or landmark." };
  }

  const now = new Date().toISOString();
  const address: SavedCustomerAddress = {
    id: crypto.randomUUID(),
    label,
    line1,
    area: (input.area ?? "").trim(),
    city: (input.city ?? "").trim() || "Multan",
    notes: (input.notes ?? "").trim(),
    createdAt: now,
    updatedAt: now,
  };

  writeRaw(ownerKey, [address, ...readRaw(ownerKey)]);
  return { ok: true, address };
}

export function removeSavedAddress(ownerKey: string, addressId: string): void {
  writeRaw(
    ownerKey,
    readRaw(ownerKey).filter((entry) => entry.id !== addressId),
  );
}

export function formatSavedAddress(address: SavedCustomerAddress): string {
  return [address.line1, address.area, address.city].filter(Boolean).join(", ");
}
