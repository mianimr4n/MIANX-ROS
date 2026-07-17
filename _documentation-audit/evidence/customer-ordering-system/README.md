# Customer Ordering System screenshot evidence

No screenshots were fabricated or captured in this run.

## Exact blocker

- The website development server was available at `http://localhost:3000`.
- Cursor browser automation reported no open tabs.
- Attempting to navigate directly to `http://localhost:3000/menu/tele-special` returned: `No browser tab available. Please navigate to a page first.`
- No local Playwright CLI was installed (`pnpm exec playwright --version` returned `Command "playwright" not found`).

## Required owner capture

After opening the local website in a browser, capture desktop (1440 × 900) and mobile (390 × 844) evidence for:

1. `/menu/tele-special` — product detail and customization
2. Cart drawer with at least one customized item
3. `/checkout` — delivery and pickup states with a successful server quote
4. `/order-success/{real-order-number}` — API-created order only
5. `/orders` — signed-in phone-matched history
6. `/track/{real-order-number}?phone={matching-phone}` — active and cancelled/completed states

Order confirmation, history, and remote tracking must use safely created API data. Do not seed or fabricate production-looking customer orders solely for screenshots.
