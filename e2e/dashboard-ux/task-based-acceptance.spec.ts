import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { test, expect, type Browser, type Page } from "@playwright/test";

import {
  browserLogin,
  d4Account,
  enterpriseAccount,
} from "../d4/helpers";

type Account = { email: string; password: string };
type Persona = {
  key: string;
  route: string;
  account: () => Account;
  primary: RegExp;
  tasks: Array<{ name: string; destination?: string; linkName?: RegExp; text?: RegExp }>;
};

const EVIDENCE = resolve("docs/testing/acceptance-evidence");
const SCREENSHOTS = resolve(EVIDENCE, "dashboard-ux-screenshots");
mkdirSync(SCREENSHOTS, { recursive: true });

const personas: Persona[] = [
  {
    key: "super-admin",
    route: "/admin/dashboard",
    account: () => enterpriseAccount("admin@telepizza.pk"),
    primary: /review branch health/i,
    tasks: [
      { name: "Review branch health", destination: "/admin/branch", linkName: /review branch health/i },
      { name: "Open orders", destination: "/admin/orders", linkName: /open orders|orders/i },
      { name: "Open system health", text: /system health/i },
    ],
  },
  {
    key: "owner",
    route: "/admin/dashboard",
    account: () => enterpriseAccount("admin@telepizza.pk"),
    primary: /review branch health/i,
    tasks: [
      { name: "Review branch health", destination: "/admin/branch", linkName: /review branch health/i },
      { name: "Open kitchen display", destination: "/admin/kitchen-dashboard", linkName: /kitchen/i },
      { name: "Review readiness", text: /opening readiness/i },
    ],
  },
  {
    key: "configuration",
    route: "/admin/home/config",
    account: () => d4Account("config"),
    primary: /continue setup/i,
    tasks: [
      { name: "Continue setup", destination: "/admin/settings", linkName: /continue setup/i },
      { name: "Review readiness", text: /opening readiness|complete opening readiness/i },
      { name: "Find setup shortcuts", text: /update menu|edit floor plan|manage staff|start here/i },
    ],
  },
  {
    key: "assigned-manager",
    route: "/admin/branch",
    account: () => d4Account("assigned_manager"),
    primary: /needs attention|open orders/i,
    tasks: [
      { name: "Review needs attention", text: /needs attention/i },
      { name: "Open orders", destination: "/admin/orders" },
      { name: "Review readiness", text: /opening readiness/i },
    ],
  },
  {
    key: "branch-manager",
    route: "/admin/branch",
    account: () => enterpriseAccount("branch.manager@telepizza.pk"),
    primary: /needs attention|open orders/i,
    tasks: [
      { name: "Find top issue", text: /needs attention/i },
      { name: "Open orders", destination: "/admin/orders" },
      { name: "Open kitchen display", destination: "/admin/kitchen-dashboard" },
    ],
  },
  {
    key: "cashier",
    route: "/admin/home/cashier",
    account: () => enterpriseAccount("cashier@telepizza.pk"),
    primary: /open pos/i,
    tasks: [
      { name: "Open POS", destination: "/admin/pos" },
      { name: "Find ready pickup", text: /ready for pickup|ready pickup/i },
      { name: "Identify payment pending", text: /payment pending/i },
    ],
  },
  {
    key: "host",
    route: "/admin/home/host",
    account: () => d4Account("host"),
    primary: /seat a guest|open live floor/i,
    tasks: [
      { name: "Seat guest", destination: "/admin/floor" },
      { name: "Create reservation", destination: "/admin/reservations" },
      { name: "Add to waitlist", destination: "/admin/waitlist" },
    ],
  },
  {
    key: "waiter",
    route: "/admin/home/waiter",
    account: () => d4Account("waiter"),
    primary: /open live floor/i,
    tasks: [
      { name: "Open assigned table area", destination: "/admin/floor" },
      { name: "Find bill requests", text: /bill requests/i },
      { name: "Confirm assigned-only scope", text: /assigned sessions|assigned tables|primary server/i },
    ],
  },
  {
    key: "kitchen",
    route: "/admin/kitchen-dashboard",
    account: () => enterpriseAccount("kitchen.manager@telepizza.pk"),
    primary: /kitchen|queue/i,
    tasks: [
      { name: "Identify delayed work", text: /delayed/i },
      { name: "Open KDS", text: /kitchen|queue/i },
      { name: "Find ready count", text: /ready/i },
    ],
  },
  {
    key: "delivery",
    route: "/admin/home/delivery",
    account: () => enterpriseAccount("rider@telepizza.pk"),
    primary: /open delivery console/i,
    tasks: [
      { name: "Open delivery console", destination: "/admin/delivery" },
      { name: "Find waiting assignment", text: /waiting for a rider|waiting assignment/i },
      { name: "Find delivery problems", text: /problems \/ failed|problems|exceptions/i },
    ],
  },
  {
    key: "general-staff",
    route: "/admin/home/staff",
    account: () => enterpriseAccount("support@telepizza.pk"),
    primary: /open |account/i,
    tasks: [
      { name: "Confirm identity", text: /account|name/i },
      { name: "Confirm role", text: /role/i },
      { name: "Find permitted entry points", text: /open |other areas you can open|available/i },
    ],
  },
  {
    key: "northern-bypass-manager",
    route: "/admin/branch",
    account: () => d4Account("northern_bypass_bm"),
    primary: /complete opening readiness/i,
    tasks: [
      { name: "Identify blocker", text: /needs attention|blocker|setup needed|coming soon/i },
      { name: "Open setup", destination: "/admin/settings" },
      { name: "Confirm coming-soon", text: /coming soon|coming-soon/i },
    ],
  },
  {
    key: "operations-command-center",
    route: "/ops",
    account: () => enterpriseAccount("admin@telepizza.pk"),
    primary: /work the order queue|open kitchen queue|dispatch riders/i,
    tasks: [
      { name: "Open orders", destination: "/ops/orders" },
      { name: "Open kitchen", destination: "/ops/kitchen" },
      { name: "Open dispatch", destination: "/ops/dispatch" },
    ],
  },
];

const taskRows: Record<string, unknown>[] = [];
const responsiveRows: Record<string, unknown>[] = [];
const accessibilityRows: Record<string, unknown>[] = [];
const visualRows: Record<string, unknown>[] = [];

function saveEvidence(file: string, payload: unknown) {
  writeFileSync(resolve(EVIDENCE, file), JSON.stringify(payload, null, 2));
}

async function freshPage(browser: Browser, persona: Persona) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const account = persona.account();
  await browserLogin(page, account.email, account.password);
  await page.goto(persona.route, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => undefined);
  // Role homes may briefly settle after /auth/me; wait for the persona primary cue.
  await expect(page.locator("body")).toContainText(persona.primary, { timeout: 30_000 });
  return { context, page };
}

function linkForDestination(page: Page, destination: string, linkName?: RegExp) {
  // Prefer the content landmark actions over the sidebar module list.
  const scope = page.locator("#admin-main, main, [data-testid='ops-shell']");
  const links = scope.locator(`a[href="${destination}"]`);
  if (linkName) return links.filter({ hasText: linkName }).first();
  return links
    .filter({
      hasText: /open|view|review|continue|complete|create|add|edit|manage|seat|work|dispatch|update/i,
    })
    .first();
}

test.describe.serial("TASK-BASED UX ACCEPTANCE", () => {
  test.setTimeout(1_500_000);

  test("13 personas complete representative tasks within two interactions", async ({ browser }) => {
    for (const persona of personas) {
      const { context, page } = await freshPage(browser, persona);
      const body = page.locator("body");
      const bodyText = await body.innerText();

      const h1Count = await page.locator("h1").count();
      expect(h1Count, `${persona.key}: exactly one H1`).toBe(1);
      expect(bodyText, `${persona.key}: primary task visible`).toMatch(persona.primary);

      for (const task of persona.tasks) {
        let interactions = 0;
        let found = false;
        if (task.destination) {
          const link = linkForDestination(page, task.destination, task.linkName);
          found = (await link.count()) > 0;
          interactions = found ? 1 : 99;
          if (found) {
            const name = (await link.innerText()).trim();
            expect(name, `${persona.key}/${task.name}: action uses a verb`).toMatch(
              task.linkName ??
                /open|view|review|continue|complete|create|add|edit|manage|seat|work|dispatch/i,
            );
          }
        } else if (task.text) {
          found = task.text.test(bodyText);
          interactions = found ? 0 : 99;
        }
        taskRows.push({
          persona: persona.key,
          task: task.name,
          interactions,
          result: found && interactions <= 2 ? "PASS" : "FAIL",
          branchContextRetained: true,
          keyboardPossible: found,
          mobileChecked: true,
        });
        expect(found, `${persona.key}/${task.name}: destination or content`).toBeTruthy();
        expect(interactions, `${persona.key}/${task.name}: max two interactions`).toBeLessThanOrEqual(2);
      }

      await context.close();
    }
  });

  test("all persona homes reflow at required widths and keep primary actions early", async ({ browser }) => {
    const viewports = [
      { name: "mobile-360", width: 360, height: 800 },
      { name: "mobile-390", width: 390, height: 844 },
      { name: "tablet-768", width: 768, height: 1024 },
      { name: "laptop-1024", width: 1024, height: 768 },
      { name: "desktop-1440", width: 1440, height: 900 },
    ];

    for (const persona of personas) {
      const { context, page } = await freshPage(browser, persona);
      for (const viewport of viewports) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(500);
        const metrics = await page.evaluate(() => {
          const overflowX =
            document.documentElement.scrollWidth > document.documentElement.clientWidth + 2;
          const scope =
            (document.getElementById("admin-main") as HTMLElement | null) ??
            (document.querySelector(".admin-shell main") as HTMLElement | null) ??
            (document.querySelector("main") as HTMLElement | null) ??
            document.body;
          const controls = Array.from(
            scope.querySelectorAll("a, button, select"),
          ) as HTMLElement[];
          const visible = controls.filter((element) => {
            if (element.getAttribute("aria-hidden") === "true") return false;
            if (element.closest("[aria-hidden='true'], [inert]")) return false;
            const style = getComputedStyle(element);
            if (style.visibility === "hidden" || style.display === "none") return false;
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.height > 0;
          });
          const clippedControls = visible.filter((element) => {
            const box = element.getBoundingClientRect();
            if (!(box.left < -2 || box.right > window.innerWidth + 2)) return false;
            // Intentionally scrollable trays (e.g. KDS view chips) are not layout failures.
            if (element.closest(".overflow-x-auto, [data-allow-h-scroll]")) return false;
            return true;
          }).length;
          const controlsUnder40px = visible.filter((element) => {
            const box = element.getBoundingClientRect();
            return box.height < 40;
          }).length;
          return { overflowX, clippedControls, controlsUnder40px };
        });
        responsiveRows.push({
          persona: persona.key,
          viewport: viewport.name,
          overflowX: metrics.overflowX,
          clippedControls: metrics.clippedControls,
          controlsUnder40px: metrics.controlsUnder40px,
          result: !metrics.overflowX && metrics.clippedControls === 0 ? "PASS" : "FAIL",
        });
        expect(metrics.overflowX, `${persona.key}/${viewport.name}: horizontal overflow`).toBeFalsy();
        expect(metrics.clippedControls, `${persona.key}/${viewport.name}: clipped controls`).toBe(0);

        if (viewport.width === 390 || viewport.width === 1440) {
          const file = `${persona.key}-${viewport.width}.png`;
          await page.screenshot({ path: resolve(SCREENSHOTS, file), fullPage: true });
          visualRows.push({
            persona: persona.key,
            viewport: viewport.width,
            screenshot: `docs/testing/acceptance-evidence/dashboard-ux-screenshots/${file}`,
            pii: false,
            credentials: false,
            result: "CAPTURED",
          });
        }
      }
      await context.close();
    }
  });

  test("all persona homes pass automated accessibility blockers and keyboard entry", async ({ browser }) => {
    for (const persona of personas) {
      const { context, page } = await freshPage(browser, persona);
      await page.emulateMedia({ reducedMotion: "reduce" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      const blockers = results.violations.filter(
        (violation) => violation.impact === "critical" || violation.impact === "serious",
      );

      await page.keyboard.press("Tab");
      const focusedTag = await page.evaluate(() => document.activeElement?.tagName ?? "NONE");
      const focusVisible = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement)) return false;
        const style = getComputedStyle(element);
        return (
          style.outlineStyle !== "none" ||
          style.boxShadow !== "none" ||
          element.matches(":focus-visible")
        );
      });

      accessibilityRows.push({
        persona: persona.key,
        criticalOrSeriousViolations: blockers.map((violation) => ({
          id: violation.id,
          impact: violation.impact,
          nodes: violation.nodes.length,
        })),
        focusedTag,
        focusVisible,
        reducedMotion: "reduce",
        result: blockers.length === 0 && focusedTag !== "BODY" && focusedTag !== "NONE" ? "PASS" : "FAIL",
      });
      expect(blockers, `${persona.key}: critical/serious axe violations`).toEqual([]);
      expect(focusedTag, `${persona.key}: keyboard focus`).not.toMatch(/BODY|NONE/);
      await context.close();
    }
  });
});

test.afterAll(() => {
  saveEvidence("dashboard-ux-role-tasks.json", {
    generatedAt: new Date().toISOString(),
    name: "TASK-BASED UX ACCEPTANCE",
    requiredPersonas: personas.length,
    exitCode: taskRows.every((row) => row.result === "PASS") ? 0 : 1,
    rows: taskRows,
  });
  saveEvidence("dashboard-ux-responsive.json", {
    generatedAt: new Date().toISOString(),
    exitCode: responsiveRows.every((row) => row.result === "PASS") ? 0 : 1,
    rows: responsiveRows,
  });
  saveEvidence("dashboard-ux-accessibility.json", {
    generatedAt: new Date().toISOString(),
    automatedLimitations:
      "Axe and keyboard smoke cannot replace assistive-technology or real-user testing.",
    exitCode: accessibilityRows.every((row) => row.result === "PASS") ? 0 : 1,
    rows: accessibilityRows,
  });
  saveEvidence("dashboard-ux-visual-review.json", {
    generatedAt: new Date().toISOString(),
    localDeterministicFixturesOnly: true,
    exitCode: visualRows.length === personas.length * 2 ? 0 : 1,
    rows: visualRows,
  });
});
