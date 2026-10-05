import { z } from 'zod';

import { levelSchema, objectiveSchema } from '@/game/core/level';

/**
 * Typed React Native ↔ Phaser WebView message protocol (see docs/adr-001-phaser-webview.md).
 *
 * - Shared by both sides: the RN app imports it, and esbuild bundles it into the WebView.
 * - Every message is `{ v, type, payload }`, serialized as JSON.
 * - Every inbound message is validated with these schemas before it is acted on; anything
 *   unknown or malformed is dropped (and reported), never handled as `any`.
 */
export const PROTOCOL_VERSION = 1;
/** Upper bound for one serialized message; protects both sides from runaway payloads. */
export const MAX_MESSAGE_BYTES = 256 * 1024;

export const SOUND_KEYS = [
  'tap',
  'swap',
  'invalid',
  'match',
  'cascade',
  'special',
  'booster',
  'objective',
  'win',
  'lose',
] as const;
export type SoundKey = (typeof SOUND_KEYS)[number];

export const HAPTIC_KINDS = ['selection', 'light', 'medium', 'heavy', 'success', 'warning', 'error'] as const;

const boosterType = z.enum(['lineRally', 'campusBurst', 'colorRally']);
const boosterInventory = z.object({
  lineRally: z.number().int().min(0),
  campusBurst: z.number().int().min(0),
  colorRally: z.number().int().min(0),
});

export const renderSettingsSchema = z.object({
  reduceMotion: z.boolean(),
  highContrast: z.boolean(),
});
export type RenderSettings = z.infer<typeof renderSettingsSchema>;

const objectiveProgressSchema = z.object({
  definition: objectiveSchema,
  current: z.number().int().min(0),
  target: z.number().int().min(0),
  completed: z.boolean(),
});

export const snapshotSchema = z.object({
  levelId: z.string(),
  moveLimit: z.number().int().min(0),
  movesRemaining: z.number().int().min(0),
  movesMade: z.number().int().min(0),
  score: z.number().int().min(0),
  objectives: z.array(objectiveProgressSchema),
  boosters: boosterInventory,
  status: z.enum(['playing', 'won', 'lost']),
  stars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
});
export type GameStateSnapshot = z.infer<typeof snapshotSchema>;

const envelope = <T extends string, P extends z.ZodType>(type: T, payload: P) =>
  z.object({ v: z.literal(PROTOCOL_VERSION), type: z.literal(type), payload });

const empty = z.object({}).strict();
const seed = z.number().int().nonnegative().max(0xffffffff);

// ---- React Native → Game -----------------------------------------------------------------------

export const nativeToGameSchema = z.discriminatedUnion('type', [
  envelope('LOAD_LEVEL', z.object({ level: levelSchema, seed, settings: renderSettingsSchema })),
  envelope('START_LEVEL', empty),
  envelope('PAUSE_GAME', empty),
  envelope('RESUME_GAME', empty),
  /** Arms a tray booster (the player then taps a target). `null` disarms. */
  envelope('USE_BOOSTER', z.object({ booster: boosterType.nullable() })),
  envelope('UPDATE_SETTINGS', renderSettingsSchema),
  envelope('REQUEST_GAME_STATE', z.object({ requestId: z.string().min(1).max(64) })),
  envelope('RESTART_LEVEL', z.object({ seed })),
]);
export type NativeToGameMessage = z.infer<typeof nativeToGameSchema>;

// ---- Game → React Native -----------------------------------------------------------------------

const levelOutcome = z.object({
  levelId: z.string(),
  score: z.number().int().min(0),
  stars: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  movesUsed: z.number().int().min(0),
  movesRemaining: z.number().int().min(0),
  winBonus: z.number().int().min(0),
  objectives: z.array(objectiveProgressSchema),
});

export const gameToNativeSchema = z.discriminatedUnion('type', [
  envelope('GAME_READY', z.object({ protocolVersion: z.number().int() })),
  envelope('LEVEL_STARTED', z.object({ snapshot: snapshotSchema })),
  envelope(
    'MOVES_CHANGED',
    z.object({ movesRemaining: z.number().int().min(0), moveLimit: z.number().int().min(0) }),
  ),
  envelope('SCORE_CHANGED', z.object({ score: z.number().int().min(0), delta: z.number().int() })),
  envelope(
    'OBJECTIVE_PROGRESS_CHANGED',
    z.object({
      objectives: z.array(objectiveProgressSchema),
      newlyCompleted: z.array(z.number().int().min(0)),
    }),
  ),
  envelope('BOOSTER_STATE_CHANGED', z.object({ inventory: boosterInventory, armed: boosterType.nullable() })),
  envelope('LEVEL_WON', levelOutcome),
  envelope('LEVEL_LOST', levelOutcome),
  envelope('GAME_ERROR', z.object({ code: z.string().max(64), message: z.string().max(500) })),
  envelope('HAPTIC_EVENT', z.object({ kind: z.enum(HAPTIC_KINDS) })),
  envelope('SOUND_EVENT', z.object({ sound: z.enum(SOUND_KEYS) })),
  envelope('GAME_STATE_RESPONSE', z.object({ requestId: z.string(), snapshot: snapshotSchema.nullable() })),
  /** A suggested-move hint or combo callout was shown (analytics + screen-reader announcement). */
  envelope(
    'HINT_SHOWN',
    z.object({ kind: z.enum(['suggested_move', 'combo_callout']), text: z.string().max(80).optional() }),
  ),
]);
export type GameToNativeMessage = z.infer<typeof gameToNativeSchema>;

// ---- Helpers -------------------------------------------------------------------------------------

type MessageOf<U extends { type: string }, T extends U['type']> = Extract<U, { type: T }>;
export type NativeMessageType = NativeToGameMessage['type'];
export type GameMessageType = GameToNativeMessage['type'];

export function nativeMessage<T extends NativeMessageType>(
  type: T,
  payload: MessageOf<NativeToGameMessage, T>['payload'],
): MessageOf<NativeToGameMessage, T> {
  return { v: PROTOCOL_VERSION, type, payload } as MessageOf<NativeToGameMessage, T>;
}

export function gameMessage<T extends GameMessageType>(
  type: T,
  payload: MessageOf<GameToNativeMessage, T>['payload'],
): MessageOf<GameToNativeMessage, T> {
  return { v: PROTOCOL_VERSION, type, payload } as MessageOf<GameToNativeMessage, T>;
}

export type ParseResult<M> = { ok: true; message: M } | { ok: false; error: string };

function parseWith<M>(schema: z.ZodType<M>, raw: unknown): ParseResult<M> {
  let value: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > MAX_MESSAGE_BYTES) return { ok: false, error: 'message too large' };
    try {
      value = JSON.parse(raw);
    } catch {
      return { ok: false, error: 'message is not valid JSON' };
    }
  }
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      ok: false,
      error: `invalid message: ${issue?.path.join('.') ?? ''} ${issue?.message ?? ''}`.trim(),
    };
  }
  return { ok: true, message: result.data };
}

export function parseNativeToGame(raw: unknown): ParseResult<NativeToGameMessage> {
  return parseWith(nativeToGameSchema, raw);
}

export function parseGameToNative(raw: unknown): ParseResult<GameToNativeMessage> {
  return parseWith(gameToNativeSchema, raw);
}

export function serialize(message: NativeToGameMessage | GameToNativeMessage): string {
  return JSON.stringify(message);
}
