import type { Location } from 'react-router-dom';

export function getSafeFromPath(location: Location, fallback: string) {
  const state = location.state as { from?: unknown } | null;
  const from = state?.from;

  if (typeof from !== 'string') return fallback;
  if (!from.startsWith('/') || from === location.pathname) return fallback;

  return from;
}
