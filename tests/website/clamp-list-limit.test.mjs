/**
 * Executable unit tests for clampListLimit (not static source matching).
 * Runs against the shared TypeScript helper via Node strip-types.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const helperUrl = pathToFileURL(
  join(root, "apps/website/client/src/lib/clamp-list-limit.ts"),
).href;

const { clampListLimit, TABLE_SERVICE_LIST_LIMIT_MAX, TABLE_SERVICE_LIST_LIMIT_MIN } =
  await import(helperUrl);

function assertFiniteIntInRange(value, label) {
  assert.equal(typeof value, "number", `${label}: type`);
  assert.ok(Number.isFinite(value), `${label}: finite`);
  assert.ok(Number.isInteger(value), `${label}: integer`);
  assert.ok(
    value >= TABLE_SERVICE_LIST_LIMIT_MIN && value <= TABLE_SERVICE_LIST_LIMIT_MAX,
    `${label}: in [${TABLE_SERVICE_LIST_LIMIT_MIN}, ${TABLE_SERVICE_LIST_LIMIT_MAX}] got ${value}`,
  );
}

describe("clampListLimit executable edge cases", () => {
  it("exports the documented min/max contract", () => {
    assert.equal(TABLE_SERVICE_LIST_LIMIT_MIN, 1);
    assert.equal(TABLE_SERVICE_LIST_LIMIT_MAX, 100);
  });

  it("undefined uses the intended default (max)", () => {
    const out = clampListLimit(undefined);
    assert.equal(out, 100);
    assertFiniteIntInRange(out, "undefined");
  });

  it("1 remains 1", () => {
    assert.equal(clampListLimit(1), 1);
  });

  it("100 remains 100", () => {
    assert.equal(clampListLimit(100), 100);
  });

  it("101 clamps to 100", () => {
    assert.equal(clampListLimit(101), 100);
  });

  it("200 clamps to 100", () => {
    assert.equal(clampListLimit(200), 100);
  });

  it("0 clamps to minimum 1", () => {
    assert.equal(clampListLimit(0), 1);
  });

  it("negative integer clamps to minimum 1", () => {
    assert.equal(clampListLimit(-5), 1);
    assert.equal(clampListLimit(-1), 1);
  });

  it("decimal below maximum truncates toward zero then keeps in range", () => {
    assert.equal(clampListLimit(12.7), 12);
    assert.equal(clampListLimit(1.9), 1);
  });

  it("decimal above maximum truncates then clamps to 100", () => {
    assert.equal(clampListLimit(100.9), 100);
    assert.equal(clampListLimit(250.4), 100);
  });

  it("NaN cannot reach URLSearchParams as NaN — falls back to max", () => {
    const out = clampListLimit(Number.NaN);
    assert.equal(out, 100);
    assert.equal(String(out), "100");
    assert.notEqual(String(out), "NaN");
  });

  it("Infinity cannot reach URLSearchParams as Infinity — falls back to max", () => {
    const out = clampListLimit(Number.POSITIVE_INFINITY);
    assert.equal(out, 100);
    assert.equal(String(out), "100");
    assert.notEqual(String(out), "Infinity");
  });

  it("every required edge case yields a finite integer in [1, 100]", () => {
    const cases = [
      undefined,
      1,
      100,
      101,
      200,
      0,
      -12,
      12.7,
      150.2,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    for (const input of cases) {
      assertFiniteIntInRange(clampListLimit(input), String(input));
    }
  });
});
