import { test, expect } from "@playwright/test";
import { browserLogin, enterpriseAccount, writeEvidence } from "../d3/helpers";

/**
 * D4 accessibility smoke — repository-supported Playwright checks
 * (heading order, keyboard focus, labels, reduced motion, overflow).
 * Does not claim WCAG certification; fails on clear blockers.
 */
test.describe("D4 accessibility smoke", () => {
  test("branch manager home: keyboard, headings, labels, reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const acct = enterpriseAccount("branch.manager@telepizza.pk");
    await browserLogin(page, acct.email, acct.password);
    await page.goto("/admin/branch");
    await page.waitForTimeout(2000);

    const findings: string[] = [];

    // Heading order: no h3 before first h1/h2; levels should not jump by >1 from previous.
    const headings = await page.locator("h1,h2,h3,h4,h5,h6").evaluateAll((els) =>
      els.map((el) => Number(el.tagName.slice(1))),
    );
    if (headings.length === 0) findings.push("no headings");
    let prev = 0;
    for (const level of headings) {
      if (prev === 0 && level > 2) findings.push(`first heading h${level}`);
      if (prev > 0 && level > prev + 1) findings.push(`heading jump h${prev}->h${level}`);
      prev = level;
    }

    // Accessible name on primary interactive controls in main landmark / body.
    const unlabeled = await page.evaluate(() => {
      const controls = Array.from(
        document.querySelectorAll("button, a[href], select, input, [role='button']"),
      ).slice(0, 40);
      return controls
        .filter((el) => {
          const html = el as HTMLElement;
          if (html.getAttribute("aria-hidden") === "true") return false;
          if ((html as HTMLButtonElement).disabled) return false;
          const label =
            html.getAttribute("aria-label") ||
            html.getAttribute("aria-labelledby") ||
            html.getAttribute("title") ||
            (html.textContent ?? "").trim() ||
            (html as HTMLInputElement).labels?.[0]?.textContent?.trim();
          return !label;
        })
        .map((el) => el.tagName.toLowerCase());
    });
    if (unlabeled.length > 0) findings.push(`unlabeled:${unlabeled.join(",")}`);

    // Keyboard: Tab should move focus visibly into page chrome.
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
    if (focusedTag === "BODY" || focusedTag === "NONE") {
      findings.push("tab-focus-stuck-on-body");
    }

    // Status must not be color-only: look for textual status words near readiness/ops.
    const body = (await page.locator("body").innerText()).toLowerCase();
    const hasStatusText =
      /ready|blocked|error|live|empty|stale|offline|loading|coming soon|not verified|limitation/i.test(
        body,
      );
    if (!hasStatusText) findings.push("no-textual-status");

    const overflowX = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
    );
    if (overflowX) findings.push("horizontal-overflow");

    writeEvidence("d4-accessibility.json", {
      result: findings.length === 0 ? "PASS" : "FAIL",
      findings,
      headingLevels: headings,
      focusedTag,
      reducedMotion: "reduce",
    });

    expect(findings, findings.join("; ")).toEqual([]);
  });
});
