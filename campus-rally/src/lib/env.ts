/**
 * Public runtime configuration. Only `EXPO_PUBLIC_*` variables are read — Expo inlines them
 * into the client bundle, so they must never contain secrets. Each variable is accessed
 * statically (process.env.EXPO_PUBLIC_X) because Expo only inlines static references.
 */
export interface PublicEnv {
  supabaseUrl: string | null;
  supabasePublishableKey: string | null;
  posthogKey: string | null;
  sentryDsn: string | null;
}

const clean = (value: string | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

/**
 * Defensive check: a Supabase service-role key (a JWT whose payload has role=service_role, or a
 * `sb_secret_` key) must never ship in a client. If one is configured we refuse to use it.
 */
export function looksLikeSecretKey(value: string): boolean {
  if (value.startsWith('sb_secret_')) return true;
  const parts = value.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = parts[1] ?? '';
    const json = typeof atob === 'function' ? atob(payload.replace(/-/g, '+').replace(/_/g, '/')) : '';
    return json.includes('"service_role"');
  } catch {
    return false;
  }
}

export function readPublicEnv(): PublicEnv {
  const key = clean(process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return {
    supabaseUrl: clean(process.env.EXPO_PUBLIC_SUPABASE_URL),
    supabasePublishableKey: key && !looksLikeSecretKey(key) ? key : null,
    posthogKey: clean(process.env.EXPO_PUBLIC_POSTHOG_KEY),
    sentryDsn: clean(process.env.EXPO_PUBLIC_SENTRY_DSN),
  };
}
