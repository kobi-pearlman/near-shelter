#!/usr/bin/env node
/**
 * Near Shelter — Oracle Cloud Poller
 *
 * Runs on an Oracle Cloud Free Tier VM in il-jerusalem-1 (Israeli IP).
 * Polls oref.org.il every 5s and POSTs alert state to the Render backend.
 *
 * Required env vars:
 *   RENDER_URL       — e.g. https://your-app.onrender.com
 *   INTERNAL_SECRET  — shared secret, must match Render's INTERNAL_SECRET
 */

const OREF_URL = 'https://www.oref.org.il/WarningMessages/alert/alerts.json';
const POLL_INTERVAL = 5_000;

const RENDER_URL = process.env.RENDER_URL;
const INTERNAL_SECRET = process.env.INTERNAL_SECRET;

if (!RENDER_URL) {
  console.error('❌  RENDER_URL env var is required');
  process.exit(1);
}
if (!INTERNAL_SECRET) {
  console.warn('⚠️   INTERNAL_SECRET not set — webhook will be unauthenticated');
}

let lastAlertId = null;
let currentlyActive = false;

async function fetchAlert() {
  const res = await fetch(OREF_URL, {
    headers: {
      Referer: 'https://www.oref.org.il/',
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (compatible; NearShelterApp/1.0)',
      'Accept-Language': 'he-IL,he;q=0.9',
    },
  });

  if (!res.ok) {
    console.warn(`⚠️   oref HTTP ${res.status}`);
    return null;
  }

  const text = (await res.text()).trim();
  if (!text || text === '{}' || text === '[]') return null;

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.warn('⚠️   oref non-JSON response:', text.slice(0, 100));
    return null;
  }

  if (!parsed.id) return null;
  return parsed;
}

async function postToRender(payload) {
  const headers = { 'Content-Type': 'application/json' };
  if (INTERNAL_SECRET) {
    headers['Authorization'] = `Bearer ${INTERNAL_SECRET}`;
  }

  try {
    const res = await fetch(`${RENDER_URL}/api/internal-alert`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.warn(`⚠️   Render webhook HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn('⚠️   Render webhook error:', err.message);
  }
}

async function poll() {
  try {
    const alert = await fetchAlert();

    if (alert) {
      if (alert.id !== lastAlertId) {
        lastAlertId = alert.id;
        currentlyActive = true;
        console.log(`🚨 Alert: ${alert.title} | ${(alert.data ?? []).join(', ')}`);
        await postToRender({ active: true, alert });
      }
    } else {
      if (currentlyActive) {
        currentlyActive = false;
        lastAlertId = null;
        console.log('✅ Alert cleared');
        await postToRender({ active: false });
      }
    }
  } catch (err) {
    console.warn('⚠️   Poll error:', err.message);
  }

  setTimeout(poll, POLL_INTERVAL);
}

console.log(`🔄 Polling oref.org.il every 5s → ${RENDER_URL}`);
poll();
