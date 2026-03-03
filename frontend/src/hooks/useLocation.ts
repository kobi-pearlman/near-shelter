import { useState, useEffect } from 'react';

export interface UserLocation {
  lat: number | null;
  lng: number | null;
  cityName: string | null;
  error: string | null;
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

export function useLocation(): UserLocation {
  const [location, setLocation] = useState<UserLocation>({
    lat: null,
    lng: null,
    cityName: null,
    error: null,
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation({ lat: null, lng: null, cityName: null, error: 'GPS לא נתמך בדפדפן זה' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocation({ lat, lng, cityName: null, error: null });
        void fetchAreaName(lat, lng).then(cityName =>
          setLocation(prev => ({ ...prev, cityName }))
        );
      },
      () => {
        setLocation({ lat: null, lng: null, cityName: null, error: 'לא ניתן לקבל מיקום' });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return location;
}
