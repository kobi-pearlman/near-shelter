import { UserLocation } from '../hooks/useLocation';

interface Props {
  isConnected: boolean;
  location: UserLocation;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isSupported: boolean;
  onSubscribe: () => void;
}

export function StatusBar({
  isConnected,
  location,
  permission,
  isSubscribed,
  isSupported,
  onSubscribe,
}: Props) {
  return (
    <div className="status-bar">
      <span className="status-item">
        <span className={`status-dot ${isConnected ? 'green' : 'red'}`} />
        <span>{isConnected ? 'מחובר לשרת' : 'לא מחובר'}</span>
      </span>

      <span className="status-item">
        <span className={`status-dot ${location.lat ? 'green' : 'orange'}`} />
        <span>
          {location.lat
            ? (location.cityName ?? '📍 מאתר עיר...')
            : (location.error ?? 'ממתין למיקום...')}
        </span>
      </span>

      {isSupported && !isSubscribed && permission !== 'denied' && (
        <button className="btn-notify" onClick={() => void onSubscribe()}>
          🔔 אפשר התראות
        </button>
      )}

      {isSubscribed && <span className="subscribed-badge">🔔 התראות פעילות</span>}

      {permission === 'denied' && (
        <span className="status-item" style={{ color: '#e74c3c', fontSize: '0.75rem' }}>
          ❌ התראות חסומות בדפדפן
        </span>
      )}
    </div>
  );
}
