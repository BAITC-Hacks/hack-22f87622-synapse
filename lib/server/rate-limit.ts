const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

const requests = new Map<string, { count: number; resetAt: number }>();

export function allowRequest(key: string, now = Date.now()): boolean {
  const current = requests.get(key);
  if (!current || current.resetAt <= now) {
    requests.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REQUESTS) return false;
  current.count += 1;
  return true;
}
