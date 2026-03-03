import { useState, useEffect } from 'react';

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

export function useAlert(userArea: string | null) {
  const [alert, setAlert] = useState<AlertData>({ active: false });
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const es = new EventSource('/api/alert-stream');

    es.onmessage = (event: MessageEvent) => {
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
    };

    return () => es.close();
  }, [userArea]);

  return { alert, isConnected };
}
