/** Device delivery address drafts + cloud sync helpers (CP-1).
 * Cloud address book is account source of truth when API is configured.
 */

export const ADDRESSES_CLOUD_SYNC_AVAILABLE = true;

export type AddressLabel = "Home" | "Office" | "Other";

export type SavedCustomerAddress = {
  id: string;
  label: AddressLabel;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  area: string;
  city: string;
  landmark: string;
  deliveryZone: string;
  preferredBranchId: string | null;
  notes: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AddressInput = {
  label: AddressLabel;
  recipientName?: string;
  phone?: string;
  line1: string;
  line2?: string;
  area?: string;
  city?: string;
  landmark?: string;
  deliveryZone?: string;
  preferredBranchId?: string | null;
  notes?: string;
  isDefault?: boolean;
};

const STORAGE_PREFIX = "telepizza.customer.addresses.";
const IMPORT_FLAG_PREFIX = "telepizza.customer.addresses.imported.";

function storageKey(ownerKey: string): string {
  return `${STORAGE_PREFIX}${ownerKey.trim().toLowerCase()}`;
}

function importFlagKey(ownerKey: string): string {
  return `${IMPORT_FLAG_PREFIX}${ownerKey.trim().toLowerCase()}`;
}

function normalizeDraft(
  entry: Partial<SavedCustomerAddress> & { id: string; line1: string },
  index: number,
): SavedCustomerAddress {
  return {
    id: entry.id,
    label:
      entry.label === "Office" || entry.label === "Other" ? entry.label : "Home",
    recipientName: entry.recipientName ?? "",
    phone: entry.phone ?? "",
    line1: entry.line1,
    line2: entry.line2 ?? "",
    area: entry.area ?? "",
    city: entry.city ?? "Multan",
    landmark: entry.landmark ?? "",
    deliveryZone: entry.deliveryZone ?? "",
    preferredBranchId: entry.preferredBranchId ?? null,
    notes: entry.notes ?? "",
    isDefault: entry.isDefault ?? index === 0,
    createdAt: entry.createdAt ?? new Date(0).toISOString(),
    updatedAt: entry.updatedAt ?? entry.createdAt ?? new Date(0).toISOString(),
  };
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
      .map(normalizeDraft);
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
    recipientName: (input.recipientName ?? "").trim(),
    phone: (input.phone ?? "").trim(),
    line1,
    line2: (input.line2 ?? "").trim(),
    area: (input.area ?? "").trim(),
    city: (input.city ?? "").trim() || "Multan",
    landmark: (input.landmark ?? "").trim(),
    deliveryZone: (input.deliveryZone ?? "").trim(),
    preferredBranchId: input.preferredBranchId ?? null,
    notes: (input.notes ?? "").trim(),
    isDefault: shouldDefault,
    createdAt: now,
    updatedAt: now,
  };

  writeRaw(ownerKey, [
    address,
    ...current.map((entry) =>
      shouldDefault ? { ...entry, isDefault: false, updatedAt: now } : entry,
    ),
  ]);
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
    recipientName: (input.recipientName ?? existing.recipientName).trim(),
    phone: (input.phone ?? existing.phone).trim(),
    line1,
    line2: (input.line2 ?? existing.line2).trim(),
    area: (input.area ?? existing.area).trim(),
    city: (input.city ?? existing.city).trim() || "Multan",
    landmark: (input.landmark ?? existing.landmark).trim(),
    deliveryZone: (input.deliveryZone ?? existing.deliveryZone).trim(),
    preferredBranchId:
      input.preferredBranchId !== undefined
        ? input.preferredBranchId
        : existing.preferredBranchId,
    notes: (input.notes ?? existing.notes).trim(),
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
  return [address.line1, address.line2, address.landmark, address.area, address.city]
    .filter(Boolean)
    .join(", ");
}

export function hasCompletedAddressImport(ownerKey: string): boolean {
  if (!ownerKey.trim()) return false;
  return localStorage.getItem(importFlagKey(ownerKey)) === "1";
}

export function markAddressImportCompleted(ownerKey: string): void {
  if (!ownerKey.trim()) return;
  localStorage.setItem(importFlagKey(ownerKey), "1");
}

export function draftToImportPayload(
  draft: SavedCustomerAddress,
  defaults?: { recipientName?: string; phone?: string },
) {
  return {
    label: draft.label,
    recipientName: draft.recipientName.trim() || defaults?.recipientName?.trim() || "Customer",
    phone: draft.phone.trim() || defaults?.phone?.trim() || "",
    line1: draft.line1,
    line2: draft.line2 || undefined,
    landmark: draft.landmark || undefined,
    area: draft.area || undefined,
    city: draft.city || undefined,
    deliveryZone: draft.deliveryZone || undefined,
    preferredBranchId: draft.preferredBranchId,
    isDefault: draft.isDefault,
    draftKey: draft.id,
  };
}
