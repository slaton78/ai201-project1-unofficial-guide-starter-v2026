import { readPublicEnv } from '@/lib/env';

/**
 * Error reporting facade. Sentry is NOT bundled in this prototype; the default reporter logs
 * in development and is silent in production builds. Swap in a Sentry-backed implementation
 * here when EXPO_PUBLIC_SENTRY_DSN is configured (see docs/backend-roadmap.md).
 */
export interface ErrorContext {
  /** Short machine-readable area, e.g. "bridge", "persistence". */
  area: string;
  /** Extra non-sensitive details. Never include player-entered text. */
  extra?: Record<string, string | number | boolean>;
}

export interface ErrorReporter {
  readonly enabled: boolean;
  captureException(error: unknown, context: ErrorContext): void;
  addBreadcrumb(message: string, data?: Record<string, string | number | boolean>): void;
}

export class ConsoleErrorReporter implements ErrorReporter {
  readonly enabled = false;
  private readonly breadcrumbs: string[] = [];
  constructor(private readonly verbose: boolean) {}

  captureException(error: unknown, context: ErrorContext): void {
    if (this.verbose)
      console.warn(`[error:${context.area}]`, error, context.extra ?? {}, this.breadcrumbs.slice(-10));
  }

  addBreadcrumb(message: string, data?: Record<string, string | number | boolean>): void {
    this.breadcrumbs.push(data ? `${message} ${JSON.stringify(data)}` : message);
    if (this.breadcrumbs.length > 50) this.breadcrumbs.shift();
  }
}

export function createErrorReporter(): ErrorReporter {
  const env = readPublicEnv();
  const dev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (env.sentryDsn && dev) {
    console.info('[errors] EXPO_PUBLIC_SENTRY_DSN is set, but the Sentry SDK is not installed yet.');
  }
  return new ConsoleErrorReporter(dev);
}

export const errorReporter: ErrorReporter = createErrorReporter();
