# Frontend — near-shelter-frontend

React 18 + TypeScript + Vite PWA. Hebrew (RTL) UI. Polls the backend for active alerts filtered by user location, registers push notifications, and shows Google Maps / Waze deep links to the nearest shelter.

## Dev Command

```bash
npm run dev     # Vite dev server on port 5173 (proxies /api/* → localhost:3001)
npm run build   # TypeScript check + Vite production build → dist/
```

## Source Files

### Hooks (`src/hooks/`)

| File | Purpose |
|------|---------|
| `useAlert.ts` | Polls `/api/alert` every 5s; filters alert by `userArea` — only shows active if user's area is in the city list |
| `useLocation.ts` | Gets GPS coords via `navigator.geolocation`; reverse-geocodes to Pikud HaOref area name via `/api/find-area`, falls back to BigDataCloud |
| `usePushNotif.ts` | Registers service worker, subscribes to Web Push, POSTs subscription + user area to `/api/subscribe` |

### Components (`src/components/`)

| File | Purpose |
|------|---------|
| `AlertBanner.tsx` | Calm blue card when no alert; pulsing red banner with city list + instructions when active |
| `ShelterButtons.tsx` | Google Maps and Waze deep-link buttons using user's GPS coordinates + query `מקלט` |
| `StatusBar.tsx` | Shows server connection status, user's area name, and notification subscription button |

### Other

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component — wires hooks to components; passes area to `useAlert` and `subscribe` |
| `src/sw.ts` | Service worker — handles `push` event (shows notification) and `notificationclick` (opens app) |
| `src/index.css` | Global styles — dark theme, RTL layout, Heebo font, alert pulse animation |
| `vite.config.ts` | Vite + vite-plugin-pwa config; `/api` proxy to backend; PWA manifest in Hebrew |

## TypeScript Config

Two tsconfig files:
- `tsconfig.json` — app code, uses `DOM` lib, **excludes** `src/sw.ts`
- `tsconfig.sw.json` — service worker only, uses `WebWorker` lib

## PWA Icons

Located in `public/icons/`. Currently placeholder solid-red PNGs generated at build time. Replace with real icons for production:
- `icon-192.png` — 192×192
- `icon-512.png` — 512×512
- `badge-72.png` — 72×72 notification badge
- `icon.svg` — SVG favicon (house with shield)

## Area Filtering Logic

`useAlert(userArea)` receives the Pikud HaOref area name from `useLocation`. If the alert's `cities` array does not include the user's area, `active` is set to `false` — the banner stays calm blue. Uses the same partial-match logic as the backend (handles plain city names before the areas cache is ready).

## Deep Link URLs

```
Google Maps: https://www.google.com/maps/search/?api=1&query=מקלט&center={lat},{lng}
Waze:        https://waze.com/ul?ll={lat},{lng}&q=מקלט&navigate=yes
```

Both open in a new tab and search for `מקלט` (shelter) near the user's coordinates.

## Key Dependencies

```
react / react-dom       UI framework
vite-plugin-pwa         Service worker + Web App Manifest generation
workbox (via plugin)    SW build toolchain
```
