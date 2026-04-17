# BlockSenseAI Mobile — Android PWA

Mobile-first Progressive Web App companion to [BlockSenseAI](https://github.com/Yassirkhan786/BlockSenseAI).

## Overview

BlockSenseAI Mobile is a touch-optimized PWA built for Android (and iOS) home screen installation. It connects to the **same Convex backend** as the web app — all data is shared in real time.

## Features

- Bottom tab navigation optimized for one-handed use
- Floating Action Button for quick utility actions
- Offline support with service worker caching
- Installable via Chrome "Add to Home Screen"
- Push notifications for alerts

## Shared Backend

Both apps connect to the same Convex deployment. Changes made in the web app appear instantly in the mobile app and vice versa. The schema and backend mutations are defined in the web repo; this repo only consumes the generated API types.

## Quick Start

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_CONVEX_URL to your deployment
npm run dev
```

## Install on Android

1. Open Chrome on Android
2. Navigate to the deployed URL
3. Tap the menu → **"Install app"** (or wait for the install prompt)
4. The app installs to your home screen with full standalone mode

## Tech Stack

- Next.js 14 (App Router)
- Convex (shared backend)
- next-pwa (service worker)
- Tailwind CSS
- TypeScript
