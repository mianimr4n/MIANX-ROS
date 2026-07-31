import { describe, expect, it } from "vitest";

import {
  computeExpectedCash,
  computeVariance,
} from "../src/services/finance/operations.js";

describe("cash reconciliation calculations", () => {
  it("computes expected cash server-side formula", () => {
    expect(
      computeExpectedCash({
        openingFloat: 5000,
        cashSales: 12000.5,
        cashRefunds: 200,
        cashDrops: 1000,
        paidOutExpenses: 350.25,
        otherInflows: 100,
        otherOutflows: 50,
      }),
    ).toBe(15500.25);
  });

  it("computes variance from counted minus expected", () => {
    expect(computeVariance(10000, 9800)).toBe(200);
    expect(computeVariance(9500, 9800)).toBe(-300);
    expect(computeVariance(null, 9800)).toBeNull();
  });

  it("never treats missing counted cash as zero variance", () => {
    const expected = computeExpectedCash({
      openingFloat: 0,
      cashSales: 0,
      cashRefunds: 0,
      cashDrops: 0,
      paidOutExpenses: 0,
      otherInflows: 0,
      otherOutflows: 0,
    });
    expect(expected).toBe(0);
    expect(computeVariance(null, expected)).toBeNull();
  });
});
