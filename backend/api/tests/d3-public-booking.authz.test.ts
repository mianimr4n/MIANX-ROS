import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, errorHandler } from "../src/common/http.js";
import { createPublicBookingRouter } from "../src/modules/public-booking/routes.js";
import {
  resetPublicBookingRateLimitBuckets,
} from "../src/services/reservations/public-booking-rate-limit.js";

/**
 * D3 — public booking route validation + IP rate limits (mocked service).
 */

const publicBooking = {
  searchPublicAvailability: vi.fn(),
  createPublicReservation: vi.fn(),
  cancelPublicReservation: vi.fn(),
  getPublicReservationStatus: vi.fn(),
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/reservations", createPublicBookingRouter({ publicBooking: publicBooking as never }));
  app.use(errorHandler);
  return app;
}

describe("D3 public booking authz / validation / rate limits", () => {
  beforeEach(() => {
    resetPublicBookingRateLimitBuckets();
    vi.clearAllMocks();
    publicBooking.searchPublicAvailability.mockResolvedValue({
      timezone: "Asia/Karachi",
      branchCode: "royal-orchard",
      branchName: "Royal Orchard",
      slots: [{ startAt: "2026-07-26T07:00:00.000Z", endAt: "2026-07-26T08:30:00.000Z", available: true }],
      policy: { slotIntervalMinutes: 30, defaultDurationMinutes: 90, maxPartySizeOnline: 10 },
    });
    publicBooking.createPublicReservation.mockResolvedValue({
      reservationNumber: "RES-260726-000001",
      status: "pending",
      timezone: "Asia/Karachi",
      startAt: "2026-07-26T07:00:00.000Z",
      cancellationToken: "tok-once",
      idempotentReplay: false,
    });
  });

  it("rejects create without Idempotency-Key", async () => {
    const res = await request(buildApp())
      .post("/api/v1/reservations")
      .send({
        branchCode: "royal-orchard",
        guestName: "Ada",
        guestPhone: "03001234567",
        partySize: 2,
        startAt: "2026-07-26T07:00:00.000Z",
        privacyAccepted: true,
      });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("IDEMPOTENCY_KEY_REQUIRED");
  });

  it("rejects create when privacyAccepted is not true", async () => {
    const res = await request(buildApp())
      .post("/api/v1/reservations")
      .set("Idempotency-Key", "k-1")
      .send({
        branchCode: "royal-orchard",
        guestName: "Ada",
        guestPhone: "03001234567",
        partySize: 2,
        startAt: "2026-07-26T07:00:00.000Z",
        privacyAccepted: false,
      });
    expect(res.status).toBe(400);
    expect(res.body.error?.code).toBe("VALIDATION_ERROR");
  });

  it("rate-limits availability after 20 requests / 60s", async () => {
    const app = buildApp();
    for (let i = 0; i < 20; i += 1) {
      const ok = await request(app).get(
        "/api/v1/reservations/availability?branchCode=royal-orchard&date=2026-07-26&partySize=2",
      );
      expect(ok.status).toBe(200);
    }
    const limited = await request(app).get(
      "/api/v1/reservations/availability?branchCode=royal-orchard&date=2026-07-26&partySize=2",
    );
    expect(limited.status).toBe(429);
    expect(limited.body.error?.code).toBe("RATE_LIMITED");
  });

  it("creates reservation when valid", async () => {
    const res = await request(buildApp())
      .post("/api/v1/reservations")
      .set("Idempotency-Key", "k-ok")
      .send({
        branchCode: "royal-orchard",
        guestName: "Ada Lovelace",
        guestPhone: "03001234567",
        partySize: 2,
        startAt: "2026-07-26T07:00:00.000Z",
        privacyAccepted: true,
      });
    expect(res.status).toBe(201);
    expect(res.body.data.reservationNumber).toBe("RES-260726-000001");
    expect(publicBooking.createPublicReservation).toHaveBeenCalledOnce();
  });

  it("maps service NOT_FOUND on status lookup", async () => {
    publicBooking.getPublicReservationStatus.mockRejectedValue(
      new ApiError(404, "NOT_FOUND", "Reservation not found."),
    );
    const res = await request(buildApp())
      .get("/api/v1/reservations/RES-1")
      .query({ token: "wrong-token-value-here" });
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe("NOT_FOUND");
  });
});
