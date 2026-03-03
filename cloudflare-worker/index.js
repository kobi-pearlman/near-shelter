/**
 * Cloudflare Worker — proxies the Pikud HaOref alert API.
 * Deployed on Cloudflare's Tel Aviv PoP so outbound requests
 * appear as Israeli IPs, bypassing the geo-block on oref.org.il.
 *
 * Deploy:
 *   1. Go to https://workers.cloudflare.com/ → Create a Worker
 *   2. Paste this file and click Save & Deploy
 *   3. Copy the worker URL (e.g. https://oref-proxy.YOUR_NAME.workers.dev)
 *   4. Set PROXY_URL=https://oref-proxy.YOUR_NAME.workers.dev in Render env vars
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
      },
    });

    const body = await response.text();

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
