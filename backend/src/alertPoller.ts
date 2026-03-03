import { EventEmitter } from 'events';

const OREF_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';
const POLL_INTERVAL = 5000;

export const alertEvents = new EventEmitter();

export interface OrefAlert {
  id: string;
  cat: string;
  title: string;
  data: string[]; // affected cities
  desc: string;
}

let lastAlertId: string | null = null;
let currentAlert: OrefAlert | null = null;
let overrideAlert: OrefAlert | null = null;

export function getCurrentAlert(): OrefAlert | null {
  return overrideAlert ?? currentAlert;
}

export function setOverrideAlert(alert: OrefAlert): void {
  overrideAlert = alert;
  alertEvents.emit('alert', alert);
}

export function clearOverrideAlert(): void {
  overrideAlert = null;
  alertEvents.emit('clear');
}

async function fetchAlert(): Promise<OrefAlert | null> {
  const proxyUrl = process.env.PROXY_URL;
  // PROXY_URL should be the full Cloudflare Worker URL (replaces OREF_URL entirely)
  const url = proxyUrl ?? OREF_URL;

  const res = await fetch(url, {
    headers: {
      Referer: 'https://www.oref.org.il/',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (compatible; NearShelterApp/1.0)',
    },
  });

  if (!res.ok) return null;

  const text = (await res.text()).trim();
  if (!text || text === '{}' || text === '[]' || text === '') return null;

  const parsed = JSON.parse(text) as Partial<OrefAlert>;
  if (!parsed.id) return null;

  return parsed as OrefAlert;
}

async function poll(): Promise<void> {
  try {
    const alert = await fetchAlert();

    if (alert) {
      if (alert.id !== lastAlertId) {
        lastAlertId = alert.id;
        currentAlert = alert;
        alertEvents.emit('alert', alert);
        console.log(`🚨 Alert: ${alert.title} | ${(alert.data ?? []).join(', ')}`);
      }
    } else {
      if (currentAlert !== null) {
        currentAlert = null;
        lastAlertId = null;
        alertEvents.emit('clear');
        console.log('✅ Alert cleared');
      }
    }
  } catch (err) {
    console.warn('⚠️  Poll error:', (err as Error).message);
  }

  setTimeout(() => void poll(), POLL_INTERVAL);
}

export function startPolling(): void {
  console.log('🔄 Starting Pikud HaOref alert polling every 5s...');
  void poll();
}
