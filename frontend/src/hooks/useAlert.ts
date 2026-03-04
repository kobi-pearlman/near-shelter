import { useState, useEffect, useRef } from 'react';

export interface AlertData {
  active: boolean;
  id?: string;
  title?: string;
  cities?: string[];
  instructions?: string;
}

/** True if userArea is included in the alert's city list.
 *  Supports both exact Pikud HaOref names and plain city names. */
function areaInAlert(userArea: string | null, cities: string[] | undefined): boolean {
  if (!userArea || !cities) return true; // area unknown → show all alerts (safe default)
  if (cities.includes(userArea)) return true;
  return cities.some(c => c.startsWith(userArea) || userArea.startsWith(c));
}

const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 30_000;

export function useAlert(userArea: string | null) {
  const [alert, setAlert] = useState<AlertData>({ active: false });
  const [isConnected, setIsConnected] = useState(true);
  const retryDelay = useRef(BASE_RETRY_MS);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let destroyed = false;

    function connect() {
      if (destroyed) return;
      es?.close();
      es = new EventSource('/api/alert-stream');

      es.onmessage = (event: MessageEvent) => {
        retryDelay.current = BASE_RETRY_MS;
        const data = JSON.parse(event.data as string) as AlertData;
        if (data.active && !areaInAlert(userArea, data.cities)) {
          setAlert({ active: false });
        } else {
          setAlert(data);
        }
        setIsConnected(true);
      };

      es.onerror = () => {
        setIsConnected(false);
        es?.close();
        if (!destroyed) {
          retryTimer.current = setTimeout(() => {
            retryDelay.current = Math.min(retryDelay.current * 2, MAX_RETRY_MS);
            connect();
          }, retryDelay.current);
        }
      };
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        if (retryTimer.current) clearTimeout(retryTimer.current);
        retryDelay.current = BASE_RETRY_MS;
        connect();
      }
    }

    connect();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      destroyed = true;
      if (retryTimer.current) clearTimeout(retryTimer.current);
      es?.close();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [userArea]);

  return { alert, isConnected };
}
