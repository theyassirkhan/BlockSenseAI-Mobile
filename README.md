# BlockSenseAI Mobile

> Mobile-first Progressive Web App for smart gated community management.
> Companion to [BlockSenseAI](https://github.com/theyassirkhan/BlockSenseAI) — shares the same Convex backend, data syncs in real time.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [PWA & Service Worker](#pwa--service-worker)
- [Mobile UI Components](#mobile-ui-components)
- [Shared Convex Backend](#shared-convex-backend)
- [Install on Android](#install-on-android)
- [Install on iOS](#install-on-ios)
- [Deployment (Vercel)](#deployment-vercel)
- [Contributing](#contributing)

---

## Overview

BlockSenseAI Mobile is a touch-optimized Progressive Web App (PWA) built for residents, RWA admins, and staff of gated residential societies. It runs on Android and iOS directly from the browser — no app store required.

The mobile app is a **separate codebase** from the web app but connects to the **same Convex deployment**. Any reading logged in the web app appears instantly in the mobile app and vice versa.

---

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────────┐
│   BlockSenseAI (Web)    │     │   BlockSenseAI-Mobile (PWA)  │
│   Next.js + Convex      │     │   Next.js + @ducanh2912/pwa  │
│   Desktop-first UI      │     │   Mobile-first UI            │
│   Defines schema &      │     │   Consumes generated API     │
│   mutations             │     │   types only                 │
└────────────┬────────────┘     └──────────────┬───────────────┘
             │                                 │
             └──────────────┬──────────────────┘
                            │
               ┌────────────▼────────────┐
               │   Convex Cloud Backend  │
               │   Real-time database    │
               │   Serverless functions  │
               │   Auth (OTP via Resend) │
               └─────────────────────────┘
```

---

## Features

### Mobile Navigation
- **Bottom tab bar** — 5 tabs (Home, Utilities, FAB, Alerts, More), 64 px tall, safe-area aware
- **Floating Action Button** — central teal FAB opens a bottom sheet with 5 quick actions
- **Top app bar** — 56 px, context-aware back button, page title, profile avatar
- **Bottom sheet** — slide-up overlay used for block switcher, FAB actions, and filters

### Utility Management
- **Utilities hub** — 2-column grid of Water, Power, Gas, Sewage, Waste, Garbage
- Per-utility detail pages with live tank levels, readings, and outage history
- Quick actions: Log Water Reading, Log Power Reading, Order Tanker, Log Outage, Raise Alert

### Alerts & Broadcasts
- Alert list with unread badge count on the tab bar icon
- Full-screen alert detail with resolve / escalate actions

### More Hub
- Staff, Residents, Vendors, Payments, Broadcasts, Service Requests, Reports, Settings, Profile, Logout — all in one vertical list

### PWA Capabilities
- **Installable** — manifest + service worker satisfies Android's install criteria
- **Offline support** — cached pages load without a connection; uncached routes show a friendly offline page
- **Service worker** — Workbox-powered with per-resource caching strategies (CacheFirst for images, StaleWhileRevalidate for JS/CSS, NetworkOnly for Convex WebSocket)
- **App shortcuts** — Water, Power, Alerts directly from the home screen long-press menu

### Touch Polish
- `tap-highlight-color: transparent` — no grey flash on tap
- `overscroll-behavior-y: none` — no rubber-band bounce outside the app
- `font-size: 16px` on inputs — prevents iOS auto-zoom
- 44 × 44 px minimum touch targets on all interactive elements
- Haptic feedback (`navigator.vibrate(10)`) on key actions
- `prefers-reduced-motion` respected — animations disabled for accessibility

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v3 |
| UI Components | Radix UI primitives |
| Backend | Convex (shared with web app) |
| Auth | @convex-dev/auth (OTP via Resend) |
| PWA | @ducanh2912/next-pwa (Workbox) |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |
| Toasts | Sonner |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Access to the shared Convex deployment (get `NEXT_PUBLIC_CONVEX_URL` from the web app's Vercel settings or `.env.local`)

### Install

```bash
git clone https://github.com/theyassirkhan/BlockSenseAI-Mobile.git
cd BlockSenseAI-Mobile
npm install
```

### Configure environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and set at minimum:

```env
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
AUTH_RESEND_KEY=re_xxxxxxxxxxxx
RESEND_API_KEY=re_xxxxxxxxxxxx
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Run development server

```bash
npm run dev
```

The service worker is **disabled in development** (`NODE_ENV=development`). To test PWA features, run a production build:

```bash
npm run build
npm run start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Convex deployment URL — **must match the web app** |
| `CONVEX_DEPLOYMENT` | Dev only | Convex deployment slug (local dev) |
| `AUTH_RESEND_KEY` | Yes | Resend API key for OTP emails |
| `RESEND_API_KEY` | Yes | Resend API key (server-side) |
| `MSG91_API_KEY` | Optional | MSG91 key for WhatsApp/SMS OTP |
| `MSG91_WHATSAPP_NUMBER` | Optional | MSG91 WhatsApp sender number |
| `NEXT_PUBLIC_APP_URL` | Yes | Full URL of this app (used in auth callbacks) |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Dev only | Convex HTTP actions URL (local dev) |

> **CRITICAL:** `NEXT_PUBLIC_CONVEX_URL` must point to the **same** Convex deployment as the web app. Do not create a new Convex project for this repo.

---

## Project Structure

```
BlockSenseAI-Mobile/
├── app/
│   ├── (auth)/                  # Login, onboarding, role select
│   ├── (admin)/                 # Platform admin routes
│   ├── (dashboard)/             # Staff/RWA dashboard routes
│   │   ├── water/
│   │   ├── power/
│   │   ├── alerts/
│   │   └── ...
│   ├── (mobile)/
│   │   └── layout.tsx           # Mobile shell: TopAppBar + BottomTabBar
│   ├── (resident)/              # Resident portal routes
│   ├── (rwa)/                   # RWA management routes
│   ├── dashboard/
│   │   ├── utilities/           # Utilities hub (2-col grid)
│   │   └── more/                # More hub (list view)
│   ├── offline/                 # Offline fallback page
│   ├── globals.css              # Global styles + mobile touch rules
│   └── layout.tsx               # Root layout with PWA metadata
│
├── components/
│   ├── mobile/
│   │   ├── BottomTabBar.tsx     # 5-tab bottom nav
│   │   ├── TopAppBar.tsx        # 56px top app bar
│   │   ├── FAB.tsx              # Floating action button + quick actions
│   │   └── BottomSheet.tsx      # Slide-up overlay
│   ├── pwa/
│   │   └── InstallPrompt.tsx    # beforeinstallprompt handler + iOS fallback
│   ├── providers/               # Convex + Theme providers
│   └── ui/                      # Radix-based component library
│
├── convex/                      # Shared Convex schema & functions
│   ├── schema.ts                # Single source of truth (edit in web repo)
│   ├── water.ts, power.ts, ...  # Serverless functions
│   └── _generated/              # Auto-generated by `convex dev`
│
├── public/
│   ├── manifest.json            # PWA manifest
│   ├── sw.js                    # Generated service worker (gitignored)
│   └── icons/                   # PWA icons (72px – 512px) + shortcut icons
│
├── hooks/
│   └── use-active-block.ts      # Active block context
├── lib/
│   └── utils.ts                 # cn(), formatKL(), formatDate(), etc.
├── middleware.ts                 # Auth middleware (public vs protected routes)
└── next.config.mjs              # Next.js + PWA config
```

---

## PWA & Service Worker

The service worker is generated by `@ducanh2912/next-pwa` (Workbox) during `npm run build`.

### Caching Strategy

| Resource | Strategy | Cache Name |
|---|---|---|
| Google Fonts | CacheFirst (1 year) | `google-fonts` |
| Images (png, jpg, svg…) | CacheFirst (30 days) | `static-images` |
| JS, CSS, fonts | StaleWhileRevalidate (7 days) | `static-resources` |
| Next.js `/_next/` chunks | StaleWhileRevalidate (30 days) | `next-static` |
| Convex (`*.convex.cloud`) | **NetworkOnly** | — |

> Convex WebSocket and HTTP traffic is **never cached**. Real-time subscriptions must always hit the network.

### Offline Fallback

When a user navigates to an uncached route while offline, the service worker serves `/offline` — a friendly page with a Retry button.

---

## Mobile UI Components

### `BottomTabBar`
Fixed 64 px bottom bar with 5 tabs. The center slot is a raised FAB rather than a flat tab. Reads the current pathname to highlight the active tab. Safe-area-inset-bottom aware.

### `TopAppBar`
Fixed 56 px top bar. Shows a back button when `showBack` is true (uses `router.back()`). Left slot accepts arbitrary content (e.g. block/society name for the block switcher). Right slot defaults to a profile avatar button.

### `FAB` (Floating Action Button)
Teal 56 × 56 px circle, positioned above the bottom tab bar. Tapping it opens a `BottomSheet` with 5 quick actions. Each action triggers `navigator.vibrate(10)` for haptic feedback before navigating.

### `BottomSheet`
Full-width slide-up overlay. Locks body scroll when open. Closes on backdrop tap or Escape key. Used by FAB, block switcher, and filter panels.

### `InstallPrompt`
Listens for the browser's `beforeinstallprompt` event. Shows a bottom sheet with Install / Not Now buttons. Stores dismissal timestamp in `localStorage` — won't re-appear for 7 days. On iOS Safari (where `beforeinstallprompt` is not supported), shows Share button instructions instead. Hidden when already running in standalone mode.

---

## Shared Convex Backend

This repo **does not own** the Convex schema or mutations. The source of truth lives in [BlockSenseAI](https://github.com/theyassirkhan/BlockSenseAI).

### How it works

1. Both repos point to the same `NEXT_PUBLIC_CONVEX_URL`
2. Both consume `convex/_generated/api` for type-safe queries and mutations
3. Schema changes must be made in the **web repo** and deployed there
4. This repo's `convex/_generated/` is regenerated by running `npx convex dev --once`

### Real-time sync

Convex uses WebSocket subscriptions. Both apps subscribe to the same data — a water reading logged in the web app will appear in the mobile app within ~100 ms.

---

## Install on Android

1. Open **Chrome** on your Android device
2. Navigate to the deployed Vercel URL
3. Wait 10–15 seconds — an install banner slides up automatically
   - Or tap **Chrome menu → "Install app"**
4. Tap **Install** — the app is added to your home screen
5. Launch it from the home screen — it opens in full standalone mode (no browser chrome)

---

## Install on iOS

1. Open **Safari** on your iPhone or iPad
2. Navigate to the deployed Vercel URL
3. Tap the **Share** button (box with arrow)
4. Scroll down and tap **"Add to Home Screen"**
5. Tap **Add** — the app icon appears on your home screen

> Note: iOS does not support `beforeinstallprompt`. The in-app install prompt will show Safari Share button instructions automatically when on iOS.

---

## Deployment (Vercel)

### First deploy

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import the `BlockSenseAI-Mobile` GitHub repo
3. Framework preset: **Next.js** (auto-detected)
4. Add environment variables (see [Environment Variables](#environment-variables))
   - `NEXT_PUBLIC_CONVEX_URL` must match the web app's value exactly
5. Click **Deploy**

### Environment variables on Vercel

Copy the values from the web app's Vercel project settings → Environment Variables. The `NEXT_PUBLIC_CONVEX_URL` is the only truly critical one for data sync. All others are needed for auth to work.

### Verify after deploy

- `https://your-url.vercel.app/manifest.json` — should return the PWA manifest
- `https://your-url.vercel.app/sw.js` — should return the service worker
- Open Chrome DevTools → Application → Service Workers — status should be **activated and running**
- Lighthouse → PWA audit should score 100

---

## Contributing

This repo is maintained independently from the web app. When making changes:

- **Schema / backend changes** → make them in [BlockSenseAI](https://github.com/theyassirkhan/BlockSenseAI), then run `npx convex dev --once` here to regenerate `convex/_generated/`
- **Mobile UI changes** → work in this repo only
- **Shared utilities** (`lib/utils.ts`, `hooks/`) → keep in sync manually between repos

Branch naming: `feature/`, `fix/`, `chore/`  
Commit style: [Conventional Commits](https://www.conventionalcommits.org/)
