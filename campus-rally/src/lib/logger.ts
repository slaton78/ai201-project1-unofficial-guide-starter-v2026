/**
 * Minimal error logging for the foundation phase. Logs in development builds only and never
 * includes player data. A real error-reporting service can replace this later.
 */
export function logError(area: string, error: unknown): void {
  if (typeof __DEV__ !== 'undefined' && __DEV__) console.warn(`[${area}]`, error);
}
