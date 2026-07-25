import { fetchApiData, ApiRequestError } from "@/lib/api";

export interface PublicAvailabilitySlot {
  startAt: string;
  endAt: string;
  available: boolean;
}

export interface PublicAvailabilityResponse {
  timezone: string;
  branchCode: string;
  branchName: string;
  slots: PublicAvailabilitySlot[];
  policy: {
    slotIntervalMinutes: number;
    defaultDurationMinutes: number;
    maxPartySizeOnline: number;
  };
}

export interface PublicReservationCreateResponse {
  reservationNumber: string;
  status: string;
  timezone: string;
  startAt: string;
  cancellationToken: string;
  idempotentReplay: boolean;
}

export interface PublicReservationStatusResponse {
  status: string;
  startAt: string;
}

export async function searchPublicAvailability(params: {
  branchCode: string;
  date: string;
  partySize: number;
}): Promise<PublicAvailabilityResponse> {
  const query = new URLSearchParams({
    branchCode: params.branchCode,
    date: params.date,
    partySize: String(params.partySize),
  });
  return fetchApiData<PublicAvailabilityResponse>(`/reservations/availability?${query.toString()}`, {
    method: "GET",
    timeoutMs: 15_000,
  });
}

export async function createPublicReservation(
  body: {
    branchCode: string;
    guestName: string;
    guestPhone: string;
    guestEmail?: string | null;
    partySize: number;
    startAt: string;
    accessibilityRequired?: boolean;
    highChairCount?: number;
    specialRequests?: string | null;
    privacyAccepted: true;
  },
  idempotencyKey: string,
): Promise<PublicReservationCreateResponse> {
  return fetchApiData<PublicReservationCreateResponse>("/reservations", {
    method: "POST",
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
    body: JSON.stringify(body),
    timeoutMs: 20_000,
  });
}

export async function cancelPublicReservation(
  reservationNumber: string,
  cancellationToken: string,
): Promise<{ reservationNumber: string; status: string; startAt: string }> {
  return fetchApiData(`/reservations/${encodeURIComponent(reservationNumber)}/cancel`, {
    method: "POST",
    body: JSON.stringify({ cancellationToken }),
    timeoutMs: 15_000,
  });
}

export async function getPublicReservationStatus(
  reservationNumber: string,
  cancellationToken: string,
): Promise<PublicReservationStatusResponse> {
  const query = new URLSearchParams({ token: cancellationToken });
  return fetchApiData<PublicReservationStatusResponse>(
    `/reservations/${encodeURIComponent(reservationNumber)}?${query.toString()}`,
    {
      method: "GET",
      timeoutMs: 15_000,
    },
  );
}

export function mapPublicBookingError(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.code === "RATE_LIMITED") return "Too many requests. Please wait a moment and try again.";
    if (error.code === "SLOT_UNAVAILABLE") return "That time is no longer available. Please pick another slot.";
    if (error.code === "ONLINE_BOOKING_DISABLED") return "Online booking is not available for this branch yet.";
    if (error.code === "PRIVACY_NOT_ACCEPTED") return "Please accept the privacy notice to continue.";
    if (error.code === "NOT_FOUND") return "Reservation not found. Check the number and cancel token.";
    if (error.code === "RESERVATION_NOT_CANCELLABLE") return "This reservation can no longer be cancelled online.";
    if (error.code === "VALIDATION_ERROR") return error.message || "Please check your details and try again.";
    if (error.code === "NETWORK" || error.code === "TIMEOUT") {
      return "We could not reach the booking service. Please retry.";
    }
    return error.message || "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}
