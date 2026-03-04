import { AlertData } from '../hooks/useAlert';
import { UserLocation } from '../hooks/useLocation';
import { ShelterButtons } from './ShelterButtons';

interface Props {
  alert: AlertData;
  location: UserLocation;
}

export function AlertBanner({ alert, location }: Props) {
  if (!alert.active) {
    return (
      <div className="alert-banner calm">
        <div className="calm-icon">🛡️</div>
        <h2>אין אזעקות פעילות</h2>
        <p>המערכת עוקבת אחר התראות פיקוד העורף</p>
        <ShelterButtons location={location} />
      </div>
    );
  }

  return (
    <div className="alert-banner active">
      <div className="alert-header">
        <span className="siren-icon">🚨</span>
        <h1>אזעקה!</h1>
        <span className="siren-icon">🚨</span>
      </div>

      <h2>{alert.title ?? 'ירי רקטות וטילים'}</h2>

      {alert.cities && alert.cities.length > 0 && (
        <div className="cities-list">
          <p className="cities-label">אזורים מוזהרים:</p>
          <ul>
            {alert.cities.map((city, i) => (
              <li key={i}>{city}</li>
            ))}
          </ul>
        </div>
      )}

      {alert.instructions && (
        <p className="instructions">{alert.instructions}</p>
      )}

      <ShelterButtons location={location} />
    </div>
  );
}
