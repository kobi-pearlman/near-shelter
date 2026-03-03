export async function findNearestArea(lat: number, lng: number): Promise<string | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=he`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'NearShelterApp/1.0 (contact: admin@near-shelter.app)' },
    });
    if (!res.ok) return null;
    const data = await res.json() as {
      address?: { city?: string; town?: string; village?: string; suburb?: string; municipality?: string };
    };
    const addr = data.address ?? {};
    const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality ?? addr.suburb;
    if (!city) return null;
    // Normalize: "תל אביב - יפו" → "תל אביב" so prefix-matching against alert zones works
    const dash = city.indexOf(' - ');
    return dash !== -1 ? city.substring(0, dash) : city;
  } catch {
    return null;
  }
}
