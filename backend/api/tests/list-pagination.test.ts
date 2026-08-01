import { describe, expect, it } from "vitest";

import { listPaginationMeta, normalizeListPagination } from "../src/lib/list-pagination.js";

describe("list pagination bounds", () => {
  it("applies default and max limits", () => {
    expect(normalizeListPagination(undefined)).toEqual({ limit: 50, offset: 0 });
    expect(normalizeListPagination({ limit: 500 })).toEqual({ limit: 100, offset: 0 });
    expect(normalizeListPagination({ limit: 0, offset: -3 })).toEqual({ limit: 1, offset: 0 });
  });

  it("builds pagination meta", () => {
    expect(listPaginationMeta(50, 0, 12, 12)).toEqual({
      limit: 50,
      offset: 0,
      returned: 12,
      total: 12,
    });
  });
});
