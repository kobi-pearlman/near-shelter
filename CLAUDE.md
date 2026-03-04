# Near Shelter — מקלט קרוב

PWA that monitors Israeli Home Front Command (Pikud HaOref) for live missile alerts (Tzeva Adom), sends Web Push notifications when the user's area is under alert, and shows Google Maps / Waze buttons to navigate to the nearest shelter.

## Project Structure

```
near_shelter/
├── backend/             Node.js + Express + TypeScript — webhook receiver, SSE, push notifications
├── frontend/            React + TypeScript + Vite — PWA UI in Hebrew (RTL)
├── cloudflare-worker/   Cloudflare Worker — legacy proxy (no longer used in production)
├── oracle-poller/       Standalone Node.js poller — runs on Oracle Cloud VM in Israel
│   ├── poller.js                  Polls oref.org.il every 5s, POSTs to Render webhook
│   └── near-shelter-poller.service  systemd service template for the Oracle VM
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

- **Geo-blocking**: The Pikud HaOref alert API (`oref.org.il`) only responds to Israeli IP addresses. In production this is solved by the Oracle Cloud VM (see Architecture below). In local dev, set `PROXY_URL` in `backend/.env` to the Cloudflare Worker URL.
- **Area filtering**: Alerts and push notifications are filtered by the user's Pikud HaOref area name (string-based prefix matching). Users only see/receive alerts relevant to their location.
- **VAPID keys**: Already generated and stored in `backend/.env`. Do not regenerate unless deploying to a new environment.
- **HTTPS required**: Geolocation API and service workers require HTTPS. In dev, `basicSsl` provides a self-signed cert. In production, Render provides HTTPS automatically.

## Production Architecture

```
Oracle Cloud VM (il-jerusalem-1, Israeli IP)
  └── oracle-poller/poller.js — polls oref.org.il every 5s
        │  on alert/clear: POST /api/internal-alert (Bearer token)
        ▼
Render (US) — near-shelter.onrender.com
  └── backend/src/index.ts
        ├── /api/alert-stream  → SSE to open browser tabs
        └── pushService        → Web Push to subscribers
```

The Render backend no longer polls oref.org.il directly (`DISABLE_POLLING=true`).
The Oracle VM runs 24/7 and is the sole source of alert events.

### Oracle Cloud VM Details
- **Provider**: Oracle Cloud Free Tier (always free)
- **Region**: il-jerusalem-1 (Israel)
- **Shape**: VM.Standard.E2.1.Micro (1 OCPU, 1 GB RAM)
- **OS**: Oracle Linux 9
- **Public IP**: 151.145.87.225
- **Poller location**: `/home/opc/near-shelter-poller/poller.js`
- **Service**: systemd `near-shelter-poller`
- **SSH**: `ssh -i ~/Downloads/ssh-key-2026-03-04.key opc@151.145.87.225`

## Alert Delivery

Three steps:
1. Oracle VM polls oref.org.il every 5s (Israeli IP → no geo-block)
2. On alert/clear, POSTs to `POST /api/internal-alert` on Render with `Authorization: Bearer <INTERNAL_SECRET>`
3. Render fires SSE to open tabs + Web Push to all subscribers

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

## Deployment

### Render environment variables

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `DISABLE_POLLING` | `true` |
| `INTERNAL_SECRET` | shared secret (must match Oracle VM) |
| `VAPID_PUBLIC_KEY` | from `backend/.env` |
| `VAPID_PRIVATE_KEY` | from `backend/.env` |
| `VAPID_EMAIL` | from `backend/.env` |

### Oracle VM setup (one-time)

```bash
# SSH in
ssh -i ~/Downloads/ssh-key-2026-03-04.key opc@151.145.87.225

# Install Node.js
sudo dnf install -y nodejs

# Copy poller (from local machine)
scp -i ~/Downloads/ssh-key-2026-03-04.key oracle-poller/poller.js opc@151.145.87.225:~/near-shelter-poller/

# Install as systemd service (edit service file with RENDER_URL + INTERNAL_SECRET first)
sudo cp ~/near-shelter-poller/near-shelter-poller.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now near-shelter-poller
sudo journalctl -u near-shelter-poller -f
```

### Oracle VM management

```bash
sudo systemctl status near-shelter-poller    # check status
sudo systemctl restart near-shelter-poller   # restart
sudo journalctl -u near-shelter-poller -f    # live logs
```

In production the backend serves the built frontend from `frontend/dist/` — one deployment for both.
