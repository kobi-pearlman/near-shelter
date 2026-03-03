import fs from 'fs';
import path from 'path';

const SUBS_FILE = path.join(__dirname, '..', 'subscriptions.json');

export interface PushSubscription {
  endpoint: string;
  keys: {
    auth: string;
    p256dh: string;
  };
  area?: string; // Pikud HaOref area name, e.g. "רמת גן - מזרח"
}

function load(): PushSubscription[] {
  if (!fs.existsSync(SUBS_FILE)) return [];
  try {
    const content = fs.readFileSync(SUBS_FILE, 'utf-8').trim();
    return content ? (JSON.parse(content) as PushSubscription[]) : [];
  } catch {
    return [];
  }
}

function save(subs: PushSubscription[]): void {
  fs.writeFileSync(SUBS_FILE, JSON.stringify(subs, null, 2));
}

export function getAll(): PushSubscription[] {
  return load();
}

export function add(sub: PushSubscription): void {
  const subs = load();
  const idx = subs.findIndex(s => s.endpoint === sub.endpoint);
  if (idx === -1) {
    subs.push(sub);
  } else {
    // Update area in case the user moved or cache became available
    subs[idx] = { ...subs[idx], area: sub.area };
  }
  save(subs);
}

export function remove(endpoint: string): void {
  const subs = load().filter(s => s.endpoint !== endpoint);
  save(subs);
}
