import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import * as subs from './subscriptions';
import * as pushService from './pushService';
import { startPolling, alertEvents, getCurrentAlert, setOverrideAlert, clearOverrideAlert } from './alertPoller';
import { initAreaFinder, findNearestArea } from './areaFinder';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────

/** Public VAPID key for client-side push subscription */
app.get('/api/vapid-public-key', (_req: Request, res: Response) => {
  res.json({ key: process.env.VAPID_PUBLIC_KEY ?? '' });
});

/** Current alert state (polling fallback for the frontend) */
app.get('/api/alert', (_req: Request, res: Response) => {
  const alert = getCurrentAlert();
  if (alert) {
    res.json({
      active: true,
      id: alert.id,
      title: alert.title,
      cities: alert.data ?? [],
      instructions: alert.desc ?? '',
    });
  } else {
    res.json({ active: false });
  }
});

/** SSE stream — pushes alert state changes to open browser tabs */
app.get('/api/alert-stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  function send(data: object) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Send current state immediately on connect
  const current = getCurrentAlert();
  if (current) {
    send({ active: true, id: current.id, title: current.title, cities: current.data ?? [], instructions: current.desc ?? '' });
  } else {
    send({ active: false });
  }

  function onAlert(alert: { id: string; title: string; data: string[]; desc: string }) {
    send({ active: true, id: alert.id, title: alert.title, cities: alert.data ?? [], instructions: alert.desc ?? '' });
  }
  function onClear() {
    send({ active: false });
  }

  alertEvents.on('alert', onAlert);
  alertEvents.on('clear', onClear);

  req.on('close', () => {
    alertEvents.off('alert', onAlert);
    alertEvents.off('clear', onClear);
  });
});

/** Register a push subscription */
app.post('/api/subscribe', (req: Request, res: Response) => {
  const sub = req.body as subs.PushSubscription;
  if (!sub?.endpoint || !sub?.keys?.auth || !sub?.keys?.p256dh) {
    res.status(400).json({ error: 'Invalid subscription object' });
    return;
  }
  subs.add(sub);
  console.log(`📌 New subscription registered (total: ${subs.getAll().length})`);
  res.status(201).json({ ok: true });
});

/** Unregister a push subscription */
app.delete('/api/subscribe', (req: Request, res: Response) => {
  const { endpoint } = req.body as { endpoint?: string };
  if (!endpoint) {
    res.status(400).json({ error: 'Missing endpoint' });
    return;
  }
  subs.remove(endpoint);
  res.json({ ok: true });
});

/** Resolve GPS coordinates → nearest Pikud HaOref area name */
app.get('/api/find-area', (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lng = parseFloat(req.query.lng as string);
  if (isNaN(lat) || isNaN(lng)) {
    res.status(400).json({ error: 'Invalid coordinates' });
    return;
  }
  const area = findNearestArea(lat, lng);
  res.json({ area });
});

const MOCK_CITIES = [
  'קריית שמונה',
  'מטולה',
  'שלומי',
  'נהריה',
  'עכו',
  'כרמיאל',
  'צפת',
  'טבריה',
  'רמת גן',
  'גבעתיים',
];

/** Dev toggle — activates or clears a mock alert via SSE + push */
app.post('/api/dev/mock-alert', (req: Request, res: Response) => {
  const { active, cityName } = req.body as { active: boolean; cityName?: string };
  if (active) {
    setOverrideAlert({
      id: `mock-${Date.now()}`,
      cat: '1',
      title: 'ירי רקטות וטילים (סימולציה)',
      data: cityName ? [cityName] : MOCK_CITIES,
      desc: 'היכנסו למרחב המוגן ושהו בו 10 דקות',
    });
  } else {
    clearOverrideAlert();
  }
  res.json({ ok: true });
});

/** Test endpoint — simulates an alert push (for development) */
app.post('/api/test-alert', async (_req: Request, res: Response) => {
  await pushService.sendAlertToAll({
    title: 'ירי רקטות וטילים (בדיקה)',
    cities: ['תל אביב - מרכז העיר', 'רמת גן', 'פתח תקווה'],
    instructions: 'היכנסו למרחב המוגן ושהו בו 10 דקות',
  });
  res.json({ ok: true, message: 'Test alert sent' });
});

// ── Alert event handlers ──────────────────────────────────────────────────

alertEvents.on('alert', (alert: { title: string; data: string[]; desc: string }) => {
  void pushService.sendAlertToAll({
    title: alert.title ?? 'אזעקה',
    cities: alert.data ?? [],
    instructions: alert.desc ?? '',
  });
});

// ── Serve frontend in production ──────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', '..', 'frontend', 'dist');
  app.use(express.static(dist));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(dist, 'index.html'));
  });
}

// ── Start ─────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🚀 Backend running on http://localhost:${PORT}`);
  pushService.init();
  startPolling();
  initAreaFinder();
});
