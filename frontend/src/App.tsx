import { useState, useEffect } from 'react';
import { useAlert } from './hooks/useAlert';
import { useLocation } from './hooks/useLocation';
import { usePushNotif } from './hooks/usePushNotif';
import { AlertBanner } from './components/AlertBanner';
import { StatusBar } from './components/StatusBar';

const DEV_CITIES = [
  'קריית שמונה', 'מטולה', 'שלומי', 'נהריה', 'עכו', 'כרמיאל', 'צפת', 'טבריה',
  'רמת גן', 'גבעתיים',
];

const selectStyle: React.CSSProperties = {
  background: '#1a1a1a',
  color: '#ddd',
  border: '1px solid #555',
  borderRadius: '4px',
  padding: '2px 6px',
  fontFamily: 'inherit',
  fontSize: '0.8rem',
  marginInlineEnd: '6px',
};

const btnStyle = (active: boolean): React.CSSProperties => ({
  background: active ? '#c0392b' : '#27ae60',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  padding: '3px 12px',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '0.8rem',
});

export default function App() {
  const location = useLocation();
  const { alert, isConnected } = useAlert(location.cityName);
  const { isSubscribed, isSupported, permission, subscribe, updateArea } = usePushNotif();

  // Silently sync push subscription area whenever the city changes
  useEffect(() => {
    if (isSubscribed && location.cityName !== null) {
      void updateArea(location.cityName);
    }
  }, [location.cityName, isSubscribed, updateArea]);

  // Frontend-only mock (UI override, no backend)
  const [feActive, setFeActive] = useState(false);
  const [feCity, setFeCity] = useState(DEV_CITIES[0]);

  // Backend mock (SSE + push notifications)
  const [beActive, setBeActive] = useState(false);
  const [beCity, setBeCity] = useState(DEV_CITIES[0]);

  async function toggleBackend() {
    const next = !beActive;
    setBeActive(next);
    await fetch('/api/dev/mock-alert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: next, cityName: beCity }),
    });
  }

  const displayAlert = feActive
    ? {
        active: true as const,
        id: 'mock-fe',
        title: 'ירי רקטות וטילים (סימולציה)',
        cities: [feCity],
        instructions: 'היכנסו למרחב המוגן ושהו בו 10 דקות',
      }
    : alert;

  return (
    <div className="app">
      {import.meta.env.DEV && (
        <div style={{ background: '#2d2d2d', padding: '8px 12px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
          <span style={{ color: '#888', fontWeight: 'bold' }}>🛠 מצב פיתוח</span>

          {/* Frontend-only toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#aaa', marginInlineEnd: '4px' }}>ממשק בלבד:</span>
            <select style={selectStyle} value={feCity} onChange={e => setFeCity(e.target.value)}>
              {DEV_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={btnStyle(feActive)} onClick={() => setFeActive(v => !v)}>
              {feActive ? '🔴 בטל' : '🚨 הפעל'}
            </button>
          </div>

          {/* Backend toggle (SSE + push) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ color: '#aaa', marginInlineEnd: '4px' }}>שרת (SSE + Push):</span>
            <select style={selectStyle} value={beCity} onChange={e => setBeCity(e.target.value)}>
              {DEV_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button style={btnStyle(beActive)} onClick={() => void toggleBackend()}>
              {beActive ? '🔴 בטל' : '🚨 הפעל'}
            </button>
          </div>
        </div>
      )}

      <header className="app-header">
        <h1>🏠 מקלט קרוב</h1>
      </header>

      <StatusBar
        isConnected={isConnected}
        location={location}
        permission={permission}
        isSubscribed={isSubscribed}
        isSupported={isSupported}
        onSubscribe={() => subscribe(location.cityName)}
      />

      <main className="app-main">
        <AlertBanner alert={displayAlert} location={location} />
      </main>

      <footer className="app-footer">
        <p>מבוסס על נתוני פיקוד העורף · {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
