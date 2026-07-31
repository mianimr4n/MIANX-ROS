import { describe, expect, it } from "vitest";

import { priceOrderLines, buildCatalogLookup } from "../src/services/orders/pricing.js";
import { collectClientMoneyWarnings } from "../src/services/orders/warnings.js";

describe("RC3 checkout coupon reconcile helpers", () => {
  const catalog = buildCatalogLookup([
    {
      id: "sku-1",
      slug: "margherita-medium",
      name: "Margherita",
      price: 1000,
      size_label: "Medium",
      size_code: "medium",
      sort_order: 1,
    },
  ]);

  it("applies server discount without trusting client money", () => {
    const priced = priceOrderLines({
      catalog,
      lines: [{ menuItemId: "sku-1", quantity: 2 }],
      discountAmount: 150,
    });
    expect(priced.subtotal).toBe(2000);
    expect(priced.discountAmount).toBe(150);
    expect(priced.totalAmount).toBe(1850);
  });

  it("caps discount at subtotal", () => {
    const priced = priceOrderLines({
      catalog,
      lines: [{ menuItemId: "sku-1", quantity: 1 }],
      discountAmount: 9999,
    });
    expect(priced.discountAmount).toBe(1000);
    expect(priced.totalAmount).toBe(0);
  });

  it("does not warn when coupon was server-applied", () => {
    const warnings = collectClientMoneyWarnings({
      items: [{ quantity: 1 } as { unitPrice?: number }],
      couponCode: "SAVE50",
      couponApplied: true,
    });
    expect(warnings.find((w) => w.code === "UNSUPPORTED_FIELD_IGNORED")).toBeUndefined();
  });

  it("warns when coupon present but not applied", () => {
    const warnings = collectClientMoneyWarnings({
      items: [{}],
      couponCode: "SAVE50",
      couponApplied: false,
    });
    expect(warnings.some((w) => w.code === "UNSUPPORTED_FIELD_IGNORED")).toBe(true);
  });
});
