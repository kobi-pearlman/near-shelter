import { useState, useEffect, useRef } from 'react';

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  cityName: string | null;
  error: string | null;
  isRefreshing: boolean;
}

async function fetchAreaName(lat: number, lng: number): Promise<string | null> {
  // Primary: backend returns the exact Pikud HaOref area name
  try {
    const res = await fetch(`/api/find-area?lat=${lat}&lng=${lng}`);
    if (res.ok) {
      const data = (await res.json()) as { area: string | null };
      if (data.area) return data.area;
    }
  } catch { /* fall through */ }

  // Fallback: plain Hebrew city name from BigDataCloud
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=he`
    );
    const data = (await res.json()) as { city?: string; locality?: string };
    return data.city || data.locality || null;
  } catch {
    return null;
  }
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DISTANCE_THRESHOLD_M = 500;

export function useLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    lat: null,
    lng: null,
    cityName: null,
    error: null,
    isRefreshing: true,
  });

  const watchIdRef = useRef<number | null>(null);
  const lastResolvedRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ lat: null, lng: null, cityName: null, error: 'GPS לא נתמך בדפדפן זה', isRefreshing: false });
      return;
    }

    async function resolveArea(lat: number, lng: number): Promise<void> {
      // Set early to prevent duplicate concurrent calls on rapid GPS ticks
      lastResolvedRef.current = { lat, lng };
      const cityName = await fetchAreaName(lat, lng);
      setLocation(prev => ({ ...prev, cityName, isRefreshing: false }));
    }

    function onPosition(pos: GeolocationPosition): void {
      const { latitude: lat, longitude: lng } = pos.coords;
      // Always update raw coords (keeps ShelterButtons deep links fresh)
      setLocation(prev => ({ ...prev, lat, lng, error: null }));

      const last = lastResolvedRef.current;
      if (!last || haversineMeters(last.lat, last.lng, lat, lng) >= DISTANCE_THRESHOLD_M) {
        void resolveArea(lat, lng);
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      onPosition,
      () => setLocation({ lat: null, lng: null, cityName: null, error: 'לא ניתן לקבל מיקום', isRefreshing: false }),
      { enableHighAccuracy: false, timeout: 10_000 }
    );

    // Re-fetch GPS + re-resolve area when the app comes back to the foreground
    function onVisibilityChange(): void {
      if (document.hidden) return;
      // Show refreshing indicator and clear cached position so area re-resolves
      lastResolvedRef.current = null;
      setLocation(prev => ({ ...prev, isRefreshing: true }));
      navigator.geolocation.getCurrentPosition(
        onPosition,
        () => setLocation(prev => ({ ...prev, isRefreshing: false })),
        { enableHighAccuracy: false, timeout: 10_000 }
      );
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return location;
}
