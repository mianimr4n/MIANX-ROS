import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function read(relativePath) {
  return readFileSync(join(workspaceRoot, relativePath), "utf8");
}

test("Phase 1 AI/3D: homepage hero communicates Multan AI positioning", () => {
  const hero = read("apps/website/client/src/components/home/ExperienceHero.tsx");
  const home = read("apps/website/client/src/pages/Home.tsx");
  assert.match(hero, /Multan.?s Pizza Experience, Powered by AI/);
  assert.match(hero, /Order Now/);
  assert.match(hero, /Explore Menu/);
  assert.match(hero, /Powered by/);
  assert.match(home, /ExperienceHero/);
  assert.match(home, /AiJourneySection/);
  assert.match(home, /MultanLocalSection/);
});

test("Phase 1 AI/3D: primary CTAs route to menu", () => {
  const hero = read("apps/website/client/src/components/home/ExperienceHero.tsx");
  assert.match(hero, /href="\/menu"/);
  assert.match(hero, /Order Now/);
  assert.match(hero, /Explore Menu/);
});

test("Phase 1 AI/3D: Mianx Assist launcher is wired into App shell", () => {
  const app = read("apps/website/client/src/App.tsx");
  const assist = read("apps/website/client/src/components/MianxAssist.tsx");
  assert.match(app, /MianxAssist/);
  assert.match(assist, /Mianx Assist/);
  assert.match(assist, /Coming soon/);
  assert.match(assist, /Recommendations are based on available Telepizza menu information/);
  assert.match(assist, /\/track/);
  assert.match(assist, /\/menu\?category=Deals/);
  assert.doesNotMatch(assist, /openai|anthropic|fetch\(['"]https?:\/\/.*ai/i);
});

test("Phase 1 AI/3D: AI journey section uses honest assistive wording", () => {
  const section = read("apps/website/client/src/components/home/AiJourneySection.tsx");
  assert.match(section, /Your order, coordinated intelligently/);
  assert.match(section, /Helps customers/);
  assert.match(section, /Powered by/);
  assert.doesNotMatch(section, /AI cooks|fully autonomous|neural network|LLM/i);
});

test("Phase 1 AI/3D: mobile menu drawer preserves Order Now and cart", () => {
  const navbar = read("apps/website/client/src/components/Navbar.tsx");
  assert.match(navbar, /Open menu|Close menu/);
  assert.match(navbar, /Order Now/);
  assert.match(navbar, /Cart/);
  assert.match(navbar, /AI-powered ordering · Powered by Mianx\.ai/);
  assert.match(navbar, /safe-area-inset-bottom/);
});

test("Phase 1 AI/3D: reduced-motion preferences are honored", () => {
  const css = read("apps/website/client/src/index.css");
  const hook = read("apps/website/client/src/hooks/usePrefersReducedMotion.ts");
  const scene = read("apps/website/client/src/components/home/PizzaHeroScene.tsx");
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(hook, /prefers-reduced-motion:\s*reduce/);
  assert.match(scene, /usePrefersReducedMotion/);
  assert.match(scene, /xp-float|xp-steam|xp-rotate-slow/);
});

test("Phase 1 AI/3D: CSS depth scene avoids heavy 3D package dependencies", () => {
  const scene = read("apps/website/client/src/components/home/PizzaHeroScene.tsx");
  const pkg = read("apps/website/package.json");
  assert.match(scene, /perspective|rotateX|translateZ/);
  assert.doesNotMatch(pkg, /"three"|@react-three\/fiber|@react-three\/drei/);
});

test("Phase 1 AI/3D: account navigation and auth entry points remain available", () => {
  const app = read("apps/website/client/src/App.tsx");
  const login = read("apps/website/client/src/pages/Login.tsx");
  const shell = read("apps/website/client/src/components/AuthPageShell.tsx");
  assert.match(app, /path="\/my-telepizza"/);
  assert.match(app, /path="\/login"/);
  assert.match(login, /SocialAuthButtons|Google|Facebook/);
  assert.match(shell, /Your Telepizza, remembered/);
  assert.match(shell, /Powered by/);
});

test("Phase 1 AI/3D: menu search supports query deep-links and discovery strip", () => {
  const menu = read("apps/website/client/src/pages/Menu.tsx");
  const discovery = read("apps/website/client/src/components/menu/MenuSmartDiscovery.tsx");
  assert.match(menu, /MenuSmartDiscovery/);
  assert.match(menu, /applyMenuQueryFromSearch/);
  assert.match(menu, /haystack\.includes\(query\)/);
  assert.match(discovery, /Not sure what to order\?/);
  assert.match(discovery, /vegetarianAvailable/);
});

test("Phase 1 AI/3D: order timeline and rewards stay honest", () => {
  const timeline = read("apps/website/client/src/components/my-telepizza/OrderStatusTimeline.tsx");
  const hub = read("apps/website/client/src/pages/MyTelepizza.tsx");
  assert.match(timeline, /aria-current=\{current \? "step" : undefined\}/);
  assert.match(hub, /Rewards are coming soon/);
  assert.match(hub, /No points balance is shown until then/);
  assert.doesNotMatch(hub, /You have \d+ points|points balance:\s*\d+/i);
});

test("Phase 1 AI/3D: skip link and footer powered-by remain present", () => {
  const app = read("apps/website/client/src/App.tsx");
  const footer = read("apps/website/client/src/components/Footer.tsx");
  assert.match(app, /Skip to main content/);
  assert.match(app, /id="main-content"/);
  assert.match(footer, /Powered by Mianx\.ai/);
  assert.match(footer, /WhatsApp/);
});

test("Phase 1 AI/3D: design tokens include kitchen experience palette", () => {
  const css = read("apps/website/client/src/index.css");
  assert.match(css, /--brand-orange/);
  assert.match(css, /--brand-gold/);
  assert.match(css, /--brand-success/);
  assert.match(css, /--z-assist/);
  assert.match(css, /--motion-base/);
});
