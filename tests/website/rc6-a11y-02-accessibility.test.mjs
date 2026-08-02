/**
 * RC6-A11Y-02 — static guards for accessible-name / touch / heading / contrast tokens.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const root = resolve("apps/website/client/src");

function read(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("RC6-A11Y-02 accessibility regressions", () => {
  it("FavoriteHeartButton does not nest unnamed Button inside Link", () => {
    const src = read("components/menu/FavoriteHeartButton.tsx");
    assert.match(src, /asChild/);
    assert.doesNotMatch(src, /<Link[\s\S]*<Button[\s\S]*<\/Button>[\s\S]*<\/Link>/);
    assert.match(src, /min-h-11 min-w-11/);
  });

  it("Navbar cart/menu controls use 44px targets and consistent Cart name", () => {
    const src = read("components/Navbar.tsx");
    assert.match(src, /aria-label=\{totalItems > 0 \? `Cart, \$\{totalItems\} items` : "Cart"\}/);
    assert.match(src, /min-h-11 min-w-11/);
    assert.match(src, /aria-expanded=\{mobileOpen\}/);
    assert.match(src, /aria-label=\{`Branch: \$\{selectedBranch\.shortName\}`\}/);
    assert.doesNotMatch(src, /aria-label="Select branch"/);
    assert.doesNotMatch(src, /"Open cart"/);
  });

  it("HeroSlider exposes one active brand h1 and deal titles as h2", () => {
    const src = read("components/home/HeroSlider.tsx");
    assert.match(src, /index === activeIndex \? \(/);
    assert.match(src, /<h1 className=/);
    assert.match(src, /<h2 className="mt-5/);
    assert.match(src, /min-h-11 min-w-11/);
  });

  it("Menu product titles use h2 and darker contrast tokens", () => {
    const src = read("pages/Menu.tsx");
    assert.match(src, /<h2 className="font-\[var\(--font-display\)\]/);
    assert.match(src, /text-brand-red-dark/);
    assert.match(src, /bg-brand-red-dark text-white/);
    assert.doesNotMatch(src, /opacity-80/);
  });

  it("carousel prev/next meet 44px touch target", () => {
    const src = read("components/ui/carousel.tsx");
    assert.match(src, /size-11 min-h-11 min-w-11/);
    assert.match(src, /Previous slide/);
    assert.match(src, /Next slide/);
  });

  it("Footer section headings are h2 and social targets are 44px", () => {
    const src = read("components/Footer.tsx");
    assert.match(src, /<h2 className="font-\[var\(--font-display\)\][^>]*>\s*Quick Links/);
    assert.match(src, /min-h-11 min-w-11 w-11 h-11/);
    assert.doesNotMatch(src, /text-white\/50/);
    assert.doesNotMatch(src, /text-white\/60/);
  });
});
