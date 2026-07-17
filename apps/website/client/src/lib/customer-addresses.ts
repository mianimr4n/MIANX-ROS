/** Local saved delivery addresses for Account Center (no server table yet). */

export type AddressLabel = "Home" | "Office" | "Other";

export type SavedCustomerAddress = {
  id: string;
  label: AddressLabel;
  line1: string;
  area: string;
  city: string;
  notes: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddressInput = {
  label: AddressLabel;
  line1: string;
  area?: string;
  city?: string;
  notes?: string;
  isDefault?: boolean;
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
    const parsed = JSON.parse(raw) as Array<Partial<SavedCustomerAddress>>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is Partial<SavedCustomerAddress> & { id: string; line1: string } =>
        Boolean(entry?.id && entry?.line1),
      )
      .map((entry, index) => ({
        id: entry.id,
        label:
          entry.label === "Office" || entry.label === "Other"
            ? entry.label
            : "Home",
        line1: entry.line1,
        area: entry.area ?? "",
        city: entry.city ?? "Multan",
        notes: entry.notes ?? "",
        isDefault: entry.isDefault ?? index === 0,
        createdAt: entry.createdAt ?? new Date(0).toISOString(),
        updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date(0).toISOString(),
      }));
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
  const line1 = input.line1.trim();
  if (!line1) {
    return { ok: false, message: "Enter a street address or landmark." };
  }

  const now = new Date().toISOString();
  const current = readRaw(ownerKey);
  const shouldDefault = input.isDefault === true || current.length === 0;
  const address: SavedCustomerAddress = {
    id: crypto.randomUUID(),
    label: input.label,
    line1,
    area: (input.area ?? "").trim(),
    city: (input.city ?? "").trim() || "Multan",
    notes: (input.notes ?? "").trim(),
    isDefault: shouldDefault,
    createdAt: now,
    updatedAt: now,
  };

  writeRaw(
    ownerKey,
    [
      address,
      ...current.map((entry) =>
        shouldDefault ? { ...entry, isDefault: false, updatedAt: now } : entry,
      ),
    ],
  );
  return { ok: true, address };
}

export function updateSavedAddress(
  ownerKey: string,
  addressId: string,
  input: AddressInput,
): { ok: true; address: SavedCustomerAddress } | { ok: false; message: string } {
  const line1 = input.line1.trim();
  if (!line1) {
    return { ok: false, message: "Enter a street address or landmark." };
  }
  const current = readRaw(ownerKey);
  const existing = current.find((entry) => entry.id === addressId);
  if (!existing) return { ok: false, message: "That saved address could not be found." };
  const now = new Date().toISOString();
  const shouldDefault = input.isDefault ?? existing.isDefault;
  const address: SavedCustomerAddress = {
    ...existing,
    label: input.label,
    line1,
    area: (input.area ?? "").trim(),
    city: (input.city ?? "").trim() || "Multan",
    notes: (input.notes ?? "").trim(),
    isDefault: shouldDefault,
    updatedAt: now,
  };
  writeRaw(
    ownerKey,
    current.map((entry) => {
      if (entry.id === addressId) return address;
      return shouldDefault && entry.isDefault
        ? { ...entry, isDefault: false, updatedAt: now }
        : entry;
    }),
  );
  return { ok: true, address };
}

export function setDefaultSavedAddress(ownerKey: string, addressId: string): void {
  const now = new Date().toISOString();
  writeRaw(
    ownerKey,
    readRaw(ownerKey).map((entry) => ({
      ...entry,
      isDefault: entry.id === addressId,
      updatedAt: entry.id === addressId || entry.isDefault ? now : entry.updatedAt,
    })),
  );
}

export function removeSavedAddress(ownerKey: string, addressId: string): void {
  const remaining = readRaw(ownerKey).filter((entry) => entry.id !== addressId);
  if (remaining.length > 0 && !remaining.some((entry) => entry.isDefault)) {
    remaining[0] = { ...remaining[0], isDefault: true, updatedAt: new Date().toISOString() };
  }
  writeRaw(ownerKey, remaining);
}

export function formatSavedAddress(address: SavedCustomerAddress): string {
  return [address.line1, address.area, address.city].filter(Boolean).join(", ");
}
