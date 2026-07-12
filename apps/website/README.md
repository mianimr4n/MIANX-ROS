# Telepizza Pakistan — Website

A modern, responsive customer-facing website for Telepizza Pakistan (Multan), built with **React 19**, **Tailwind CSS 4**, and **shadcn/ui**. Features include a full menu with category filtering, a shopping cart with WhatsApp-based ordering, a branch selector, Google Maps integration, and a "Flame & Crust" design system inspired by pizza oven aesthetics.

---

## Prerequisites

- **Node.js** >= 20.x
- **pnpm** >= 10.x (install: `npm install -g pnpm`)

---

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start the development server

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`.

### 3. Run TypeScript type checking

```bash
pnpm check
```

### 4. Run the production build

```bash
pnpm build
```

This runs two steps:

1. **Vite** builds the client SPA into `dist/public/`.
2. **esbuild** bundles `server/index.ts` into `dist/index.js` (Express static file server).

### 5. Start the production server

```bash
pnpm start
```

---

## Environment Variables

The following optional environment variables are supported. None are required — the app works without them.

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Express server port | `3000` (default) |
| `VITE_APP_TITLE` | Page title in `<head>` | `Telepizza Pakistan` |
| `VITE_APP_LOGO` | Favicon/logo URL | `/logo.png` |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps JavaScript API key (required for map) | `AIzaSy...` |

> **Note:** Analytics are intentionally disabled in this build. To add analytics (e.g., Umami), inject the script tag into `client/index.html` and set the appropriate environment variables in your `.env` file.

---

## Project Structure

```
apps/website/
├── client/                  # React frontend (Vite root)
│   ├── index.html           # Entry HTML
│   ├── public/              # Static assets (favicon, robots.txt only)
│   └── src/
│       ├── App.tsx          # Routes & top-level layout
│       ├── main.tsx         # React entry point
│       ├── index.css        # Global styles & Tailwind theme tokens
│       ├── pages/           # Page-level components
│       │   ├── Home.tsx     # Landing page (hero, branches, deals)
│       │   ├── Menu.tsx     # Menu with category tabs & search
│       │   ├── About.tsx    # Brand story & stats
│       │   ├── Contact.tsx  # Branch cards, hours, Google Maps
│       │   └── NotFound.tsx # 404 fallback
│       ├── components/      # Shared UI components
│       │   ├── Navbar.tsx   # Sticky header + branch selector
│       │   ├── Footer.tsx   # Site footer
│       │   ├── CartDrawer.tsx # Slide-out cart + WhatsApp order
│       │   ├── Map.tsx      # Google Maps integration (proxy-authenticated)
│       │   └── ui/          # shadcn/ui component library
│       ├── contexts/        # React contexts
│       │   ├── BranchContext.tsx  # Active branch state
│       │   ├── CartContext.tsx    # Shopping cart state
│       │   └── ThemeContext.tsx   # Light/dark theme
│       ├── hooks/           # Custom React hooks
│       └── lib/             # Utility helpers
├── server/
│   └── index.ts             # Express static file server (prod only)
├── shared/
│   └── const.ts             # Shared constants
├── patches/
│   └── wouter@3.7.1.patch   # Wouter router patch
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts           # Vite configuration
└── components.json          # shadcn/ui config
```

---

## Design System: "Flame & Crust"

The site uses a custom design language defined in `client/src/index.css`:

| Token | Value | Purpose |
|---|---|---|
| `--brand-red` | `oklch(0.55 0.2 20)` | Telepizza signature red (buttons, accents) |
| `--brand-charcoal` | `oklch(0.25 0.01 280)` | Dark charcoal (headings, deep sections) |
| `--brand-gold` | `oklch(0.85 0.15 85)` | Ember gold (badges, highlights) |
| `--brand-cream` | `oklch(0.97 0.005 80)` | Cream white (page backgrounds) |

Typography: **Poppins** (display headings), **DM Sans** (body text), **Space Grotesk** (accent labels).

---

## Key Features

- **Branch selector** — Toggle between operating branch (Royal Orchard) and coming-soon branch (Northern Bypass Road)
- **WhatsApp ordering** — Cart items are compiled into a pre-formatted WhatsApp message sent to the active branch number
- **Google Maps** — Interactive map with markers for both Multan locations. The `Map.tsx` component currently uses a proxy-authenticated Google Maps JS API loader; for production deployment, replace it with a standard API key loader.
- **Mobile-first responsive** — Full mobile navigation drawer, touch-friendly cart, and responsive grid layouts

---

## Deployment Notes

### Static hosting (recommended)

The `dist/public/` directory contains the entire SPA and can be served by any static host (Vercel, Netlify, Cloudflare Pages, GitHub Pages). No server required for the frontend.

### Full-stack with Express

For deployments requiring server-side static file serving (e.g., Railway, Render):

```bash
pnpm build
pnpm start
```

The Express server (`dist/index.js`) serves `dist/public/` and falls back to `index.html` for client-side routing.

### Google Maps

The map component proxies Google Maps requests through a backend. If deploying without the proxy, you will need to provide a Google Maps API key and modify `client/src/components/Map.tsx` to use the standard `loadScript` approach with your key.
