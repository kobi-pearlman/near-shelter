# Near Shelter — מקלט קרוב

PWA that monitors Israeli Home Front Command (Pikud HaOref) for live missile alerts (Tzeva Adom), sends Web Push notifications when the user's area is under alert, and shows Google Maps / Waze buttons to navigate to the nearest shelter.

## Project Structure

```
near_shelter/
├── backend/             Node.js + Express + TypeScript — alert polling, push notifications
├── frontend/            React + TypeScript + Vite — PWA UI in Hebrew (RTL)
├── cloudflare-worker/   Cloudflare Worker — Israeli IP proxy for oref.org.il
├── package.json         Root build/start scripts (for Render deployment)
├── .gitignore
└── CLAUDE.md
```

## Running Locally

```bash
# Terminal 1 — backend (port 3001)
cd backend && npm run dev

# Terminal 2 — frontend (port 5173, HTTPS via basicSsl)
cd frontend && npm run dev
```

Open `https://localhost:5173` (note: **https** — basicSsl plugin is active).
The frontend proxies all `/api/*` requests to `http://localhost:3001`.

## Key Constraints

- **Geo-blocking**: The Pikud HaOref alert API (`oref.org.il`) only responds to Israeli IP addresses. Set `PROXY_URL` in `backend/.env` to the Cloudflare Worker URL to bypass this. The Worker routes outbound requests through Cloudflare's Tel Aviv PoP.
- **Area filtering**: Alerts and push notifications are filtered by the user's Pikud HaOref area name (string-based prefix matching). Users only see/receive alerts relevant to their location.
- **VAPID keys**: Already generated and stored in `backend/.env`. Do not regenerate unless deploying to a new environment.
- **HTTPS required**: Geolocation API and service workers require HTTPS. In dev, `basicSsl` provides a self-signed cert. In production, Render provides HTTPS automatically.

## Alert Delivery

Two parallel paths:
1. **SSE** (`/api/alert-stream`) — pushes state changes to open browser tabs in real time
2. **Web Push** — backend sends push to registered subscribers (works when app is closed)

The backend polls oref.org.il every 5s. On a new alert, both paths fire simultaneously.

## Dev Mode Mock Alerts

The app has a dev toolbar (only visible in `import.meta.env.DEV`) with two toggles:

| Toggle | What it does |
|--------|-------------|
| ממשק בלבד | Frontend-only override — updates UI locally, no network call |
| שרת (SSE + Push) | Calls `POST /api/dev/mock-alert` → SSE + push notifications fire |

Both have a city dropdown. Cities: קריית שמונה, מטולה, שלומי, נהריה, עכו, כרמיאל, צפת, טבריה, רמת גן, גבעתיים.

## Testing an Alert (Dev)

```bash
# Via curl (uses hardcoded test cities: תל אביב, רמת גן, פתח תקווה)
curl -X POST http://localhost:3001/api/test-alert

# Via dev toolbar in the UI (preferred — lets you pick city)
```

## Deployment (Render + Cloudflare Worker)

### 1. Deploy Cloudflare Worker (Israeli IP proxy)
- Go to workers.cloudflare.com → Create Worker
- Paste `cloudflare-worker/index.js` → Save & Deploy
- Copy the Worker URL: `https://oref-proxy.YOUR_NAME.workers.dev`

### 2. Deploy on Render (free)
- Push repo to GitHub, connect on render.com → New Web Service
- **Build Command**: `npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PROXY_URL` | `https://oref-proxy.YOUR_NAME.workers.dev` |
| `VAPID_PUBLIC_KEY` | from `backend/.env` |
| `VAPID_PRIVATE_KEY` | from `backend/.env` |
| `VAPID_EMAIL` | from `backend/.env` |

In production the backend serves the built frontend from `frontend/dist/` — one deployment for both.
