import { fetchApiData, isApiConfigured } from "@/lib/api";
import type { AddressLabel } from "@/lib/customer-addresses";

export type CloudCustomerAddress = {
  id: string;
  label: AddressLabel;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  landmark: string;
  area: string;
  city: string;
  deliveryZone: string;
  preferredBranchId: string | null;
  isDefault: boolean;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
};

export type CloudAddressInput = {
  label: AddressLabel;
  recipientName: string;
  phone: string;
  line1: string;
  line2?: string;
  landmark?: string;
  area?: string;
  city?: string;
  deliveryZone?: string;
  preferredBranchId?: string | null;
  isDefault?: boolean;
};

export type CloudAddressImportItem = CloudAddressInput & { draftKey?: string };

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export function cloudAddressesAvailable(): boolean {
  return isApiConfigured;
}

export async function fetchCloudAddresses(accessToken: string): Promise<CloudCustomerAddress[]> {
  const data = await fetchApiData<{ addresses: CloudCustomerAddress[] }>("/me/addresses", {
    headers: authHeaders(accessToken),
  });
  return data.addresses ?? [];
}

export async function createCloudAddress(
  accessToken: string,
  input: CloudAddressInput,
): Promise<CloudCustomerAddress> {
  const data = await fetchApiData<{ address: CloudCustomerAddress }>("/me/addresses", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(input),
  });
  return data.address;
}

export async function updateCloudAddress(
  accessToken: string,
  addressId: string,
  input: CloudAddressInput,
): Promise<CloudCustomerAddress> {
  const data = await fetchApiData<{ address: CloudCustomerAddress }>(
    `/me/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(input),
    },
  );
  return data.address;
}

export async function archiveCloudAddress(
  accessToken: string,
  addressId: string,
): Promise<CloudCustomerAddress> {
  const data = await fetchApiData<{ address: CloudCustomerAddress }>(
    `/me/addresses/${encodeURIComponent(addressId)}`,
    {
      method: "DELETE",
      headers: authHeaders(accessToken),
    },
  );
  return data.address;
}

export async function importCloudAddresses(
  accessToken: string,
  drafts: CloudAddressImportItem[],
): Promise<{ imported: CloudCustomerAddress[]; skipped: number; importedCount: number }> {
  return fetchApiData<{
    imported: CloudCustomerAddress[];
    skipped: number;
    importedCount: number;
  }>("/me/addresses/import", {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ drafts }),
  });
}
