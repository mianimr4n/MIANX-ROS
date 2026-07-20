import { fetchApiData, isApiConfigured } from "@/lib/api";

export type CloudReview = {
  id: string;
  orderId: string;
  orderNumber: string;
  rating: number;
  comment: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ReviewInput = {
  rating: number;
  comment?: string;
};

function authHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export function reviewsAvailable(): boolean {
  return isApiConfigured;
}

export async function fetchCloudReviews(accessToken: string): Promise<CloudReview[]> {
  const data = await fetchApiData<{ reviews: CloudReview[] }>("/me/reviews", {
    headers: authHeaders(accessToken),
  });
  return data.reviews ?? [];
}

export async function createCloudReview(
  accessToken: string,
  orderNumber: string,
  input: ReviewInput,
): Promise<CloudReview> {
  const data = await fetchApiData<{ review: CloudReview }>(
    `/me/orders/${encodeURIComponent(orderNumber)}/review`,
    {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(input),
    },
  );
  return data.review;
}

export async function updateCloudReview(
  accessToken: string,
  orderNumber: string,
  input: ReviewInput,
): Promise<CloudReview> {
  const data = await fetchApiData<{ review: CloudReview }>(
    `/me/orders/${encodeURIComponent(orderNumber)}/review`,
    {
      method: "PATCH",
      headers: authHeaders(accessToken),
      body: JSON.stringify(input),
    },
  );
  return data.review;
}
