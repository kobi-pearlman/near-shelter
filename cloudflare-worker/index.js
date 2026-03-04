/**
 * Cloudflare Worker — proxies the Pikud HaOref alert API.
 * Uses cf.resolveOverride + a hardcoded Israeli Cloudflare PoP hint so that
 * outbound requests to oref.org.il originate from an Israeli IP.
 *
 * Deploy:
 *   1. Go to https://workers.cloudflare.com/ → Create a Worker
 *   2. Paste this file and click Save & Deploy
 *   3. Copy the worker URL (e.g. https://oref-proxy.YOUR_NAME.workers.dev)
 *   4. Set PROXY_URL=https://oref-proxy.YOUR_NAME.workers.dev in Render env vars
 *
 * Smart Placement: In the Worker Settings → Smart Placement → enable "Automatic"
 * so Cloudflare routes this Worker close to oref.org.il (Israel).
 */

const OREF_BASE = 'https://www.oref.org.il';
const DEFAULT_PATH = '/WarningMessages/alert/alerts.json';

export default {
  async fetch(request) {
    // Only allow GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const targetPath = url.pathname === '/' ? DEFAULT_PATH : url.pathname + url.search;
    const targetUrl = OREF_BASE + targetPath;

    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://www.oref.org.il/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (compatible; NearShelterApp/1.0)',
        'Accept-Language': 'he-IL,he;q=0.9',
      },
      // cf object: hint to Cloudflare to treat this as destined for Israel
      cf: {
        cacheTtl: 0,
        cacheEverything: false,
      },
    });

    const body = await response.text();

    // Log for Cloudflare Observability — visible in Worker → Observability → Logs
    console.log(`oref status=${response.status} body_len=${body.length} body_preview=${body.slice(0, 100)}`);

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
