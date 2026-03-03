# Backend — near-shelter-backend

Node.js + Express + TypeScript server. Polls the Pikud HaOref alert API, sends area-filtered Web Push notifications, and exposes REST endpoints for the frontend.

## Dev Command

```bash
npm run dev   # tsx watch src/index.ts — hot reload on port 3001
```

## Source Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Express server entry, route definitions, startup orchestration |
| `src/alertPoller.ts` | Polls `oref.org.il` every 5 seconds, emits `alert` / `clear` events |
| `src/pushService.ts` | Initializes web-push with VAPID keys, sends area-filtered push notifications |
| `src/subscriptions.ts` | Read/write push subscriptions to `subscriptions.json` (includes stored area per subscriber) |
| `src/areaFinder.ts` | Builds and caches a Pikud HaOref areas → coordinates map; exposes `findNearestArea(lat, lng)` |

## API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/alert` | Current alert state `{ active, id, title, cities[], instructions }` |
| `GET` | `/api/vapid-public-key` | VAPID public key for client push subscription |
| `POST` | `/api/subscribe` | Register push subscription `{ endpoint, keys, area? }` |
| `DELETE` | `/api/subscribe` | Remove push subscription `{ endpoint }` |
| `GET` | `/api/find-area?lat=X&lng=Y` | Nearest Pikud HaOref area name for given coordinates |
| `POST` | `/api/test-alert` | Simulate an alert — sends push to area-matched subscribers |

## Important Files

- `backend/.env` — VAPID keys and optional `PROXY_URL` (do not commit)
- `subscriptions.json` — auto-created on first subscribe, stores push subscriptions with user areas
- `areas_cache.json` — auto-built on first startup by geocoding all Pikud HaOref areas via Nominatim (~5 min, runs once, then loads instantly)

## Alert Polling Flow

1. `alertPoller.ts` fetches `https://www.oref.org.il/WarningMessages/alert/alerts.json` with `Referer` and `X-Requested-With` headers
2. Compares `alert.id` to detect new alerts
3. On new alert → `alertEvents.emit('alert', alert)`
4. `index.ts` handles the event → calls `pushService.sendAlertToAll()`
5. `pushService` filters subscribers: only those whose `area` appears in `alert.data` (cities list) get a push

## Area Filtering Logic

Stored in `subscriptions.json` per subscriber: `area` field (Pikud HaOref area name, e.g. `"רמת גן - מזרח"`).

Matching supports:
- **Exact**: `"רמת גן - מזרח"` matches `["רמת גן - מזרח"]`
- **Partial**: `"רמת גן"` (BigDataCloud fallback) matches `["רמת גן - מזרח", "רמת גן - מערב"]`
- **No area stored**: subscriber receives all alerts (safe default)

## Environment Variables

```
VAPID_PUBLIC_KEY=   # Required for push notifications
VAPID_PRIVATE_KEY=  # Required for push notifications
VAPID_EMAIL=        # mailto: contact for VAPID
PORT=3001           # Default port
PROXY_URL=          # Optional HTTP proxy to bypass geo-blocking
```
