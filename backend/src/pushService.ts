import webpush from 'web-push';
import * as subs from './subscriptions';

export function init(): void {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  Missing VAPID keys. Push notifications disabled.');
    console.warn('   Generate with: npx web-push generate-vapid-keys');
    return;
  }
  webpush.setVapidDetails(
    `mailto:${VAPID_EMAIL ?? 'admin@near-shelter.app'}`,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  console.log('✅ Web Push initialized');
}

export interface AlertPayload {
  title: string;
  cities: string[];
  instructions: string;
}

/** Returns true if the subscriber's area is included in the alert's city list.
 *  Supports both exact Pikud HaOref names ("רמת גן - מזרח") and plain city
 *  names ("רמת גן") from the BigDataCloud fallback. */
function areaMatches(subArea: string | undefined, alertCities: string[]): boolean {
  if (!subArea) return true; // no area stored → send all alerts (safe default)
  if (alertCities.includes(subArea)) return true;
  // Partial match: plain city name covers multiple zones (e.g. "רמת גן" → "רמת גן - מזרח")
  return alertCities.some(c => c.startsWith(subArea) || subArea.startsWith(c));
}

export async function sendAlertToAll(alert: AlertPayload): Promise<void> {
  const subscriptions = subs.getAll();
  if (subscriptions.length === 0) return;

  const relevant = subscriptions.filter(sub => areaMatches(sub.area, alert.cities));
  if (relevant.length === 0) {
    console.log('📨 No subscribers in alerted areas — push skipped');
    return;
  }

  const body =
    alert.cities.length > 0
      ? `ירי רקטות: ${alert.cities.slice(0, 5).join(', ')}`
      : alert.title;

  const payload = JSON.stringify({
    title: '🚨 אזעקה - צבע אדום!',
    body,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    tag: 'missile-alert',
    requireInteraction: true,
    vibrate: [200, 100, 200, 100, 200],
    data: { url: '/' },
  });

  const results = await Promise.allSettled(
    relevant.map(sub =>
      webpush
        .sendNotification(sub, payload, { urgency: 'high', TTL: 30 })
        .catch((err: { statusCode?: number }) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            subs.remove(sub.endpoint);
          }
          throw err;
        })
    )
  );

  const sent = results.filter(r => r.status === 'fulfilled').length;
  console.log(`📨 Push sent to ${sent}/${relevant.length} area-matched subscribers (${subscriptions.length} total)`);
}
