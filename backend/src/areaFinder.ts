import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join(__dirname, '..', 'areas_cache.json');
const CITIES_PATH = '/Shared/Ajax/GetCities.aspx?lang=he';
const CITIES_OREF_URL = 'https://www.oref.org.il' + CITIES_PATH;

interface OrefCity {
  value: string;
  areaname: string;
  label: string;
}

interface AreaWithCoords {
  name: string;
  lat: number;
  lng: number;
}

let areasData: AreaWithCoords[] | null = null;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestArea(lat: number, lng: number): string | null {
  if (!areasData || areasData.length === 0) return null;
  let minDist = Infinity;
  let nearest: AreaWithCoords | null = null;
  for (const area of areasData) {
    const dist = haversineKm(lat, lng, area.lat, area.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = area;
    }
  }
  return nearest?.name ?? null;
}

async function geocodeArea(name: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Strip punctuation/dashes for better Nominatim results
    const query = name.replace(/-/g, ' ').replace(/\s+/g, ' ').trim() + ' ישראל';
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=he&countrycodes=il`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NearShelterApp/1.0 (contact: admin@near-shelter.app)' },
    });
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function buildCache(): Promise<void> {
  console.log('🗺️  Building Pikud HaOref areas cache — this runs once in the background...');

  let cities: OrefCity[];
  try {
    const proxyBase = process.env.PROXY_URL;
    const citiesUrl = proxyBase ? proxyBase.replace(/\/$/, '') + CITIES_PATH : CITIES_OREF_URL;
    const res = await fetch(citiesUrl, {
      headers: {
        Referer: 'https://www.oref.org.il/',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (compatible; NearShelterApp/1.0)',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    cities = (await res.json()) as OrefCity[];
  } catch (err) {
    console.warn('⚠️  Could not fetch Pikud HaOref cities list:', (err as Error).message);
    return;
  }

  const areas: AreaWithCoords[] = [];

  for (let i = 0; i < cities.length; i++) {
    const city = cities[i];
    const coords = await geocodeArea(city.value);
    if (coords) {
      areas.push({ name: city.value, lat: coords.lat, lng: coords.lng });
    }
    // Nominatim rate limit: max 1 request/second
    await sleep(1100);

    if ((i + 1) % 50 === 0) {
      console.log(`🗺️  Geocoded ${i + 1}/${cities.length} areas...`);
    }
  }

  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(areas, null, 2));
    areasData = areas;
    console.log(`✅ Areas cache ready — ${areas.length} areas indexed`);
  } catch (err) {
    console.warn('⚠️  Could not write areas cache:', (err as Error).message);
    areasData = areas; // Use in-memory even if write fails
  }
}

export function initAreaFinder(): void {
  // Load from existing cache file (fast path)
  if (fs.existsSync(CACHE_FILE)) {
    try {
      areasData = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8')) as AreaWithCoords[];
      console.log(`✅ Loaded ${areasData.length} Pikud HaOref areas from cache`);
      return;
    } catch {
      console.warn('⚠️  Areas cache corrupted, rebuilding...');
    }
  }

  // Build cache in background — does not block server startup
  void buildCache();
}
