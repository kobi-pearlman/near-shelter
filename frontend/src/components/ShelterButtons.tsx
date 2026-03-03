import { UserLocation } from '../hooks/useLocation';

interface Props {
  location: UserLocation;
}

export function ShelterButtons({ location }: Props) {
  if (!location.lat || !location.lng) {
    return (
      <p className="location-notice">
        אנא אפשר גישה למיקום GPS כדי לנווט למקלט הקרוב ביותר
      </p>
    );
  }

  const { lat, lng } = location;
  const query = encodeURIComponent('מקלט');
  // Search "מקלט" centred on the user's coordinates at zoom 16
  const googleMapsUrl = `https://www.google.com/maps/search/${query}/@${lat},${lng},16z`;
  // Waze: q-only search (no ll) so Waze searches near the phone's live GPS position
  const wazeUrl = `https://waze.com/ul?q=${query}&navigate=yes`;

  return (
    <div className="shelter-buttons">
      <a
        href={googleMapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-map google"
      >
        <span>🗺️</span>
        <span>Google Maps — מקלטים קרובים</span>
      </a>
      <a
        href={wazeUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-map waze"
      >
        <span>🔵</span>
        <span>Waze — מקלטים קרובים</span>
      </a>
    </div>
  );
}
