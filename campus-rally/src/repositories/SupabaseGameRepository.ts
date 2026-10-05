import type { GameSave } from '@/types/save';

import type { GameRepository } from './GameRepository';

/**
 * PLACEHOLDER — not implemented and not used by the MVP.
 *
 * Intended design (see docs/backend-roadmap.md):
 * - Auth: Supabase anonymous sign-in, upgradable to email/Apple/Google later.
 * - Reads: `profiles`, `player_progress` rows for `auth.uid()` (RLS-protected).
 * - Writes: progression is NOT written directly by the client. Level results go to an Edge
 *   Function (`submit-level-attempt`) that re-validates the attempt server-side before
 *   updating `player_progress`.
 * - The client only ever uses the publishable (anon) key. The service-role key must never
 *   be bundled in the app.
 *
 * Every method rejects so an accidental wiring is loud instead of silently losing data.
 */
export interface SupabaseRepositoryConfig {
  url: string;
  publishableKey: string;
}

export class SupabaseNotConfiguredError extends Error {
  constructor() {
    super('SupabaseGameRepository is a stub. Local persistence is used in this prototype.');
    this.name = 'SupabaseNotConfiguredError';
  }
}

export class SupabaseGameRepository implements GameRepository {
  readonly kind = 'supabase' as const;

  constructor(readonly config: SupabaseRepositoryConfig) {}

  async load(): Promise<GameSave> {
    throw new SupabaseNotConfiguredError();
  }

  async save(_save: GameSave): Promise<void> {
    throw new SupabaseNotConfiguredError();
  }

  async reset(): Promise<GameSave> {
    throw new SupabaseNotConfiguredError();
  }
}
