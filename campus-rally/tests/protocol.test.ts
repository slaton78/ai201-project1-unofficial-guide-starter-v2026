import { describe, expect, it } from 'vitest';

import { LEVELS } from '@/content/levels';
import {
  gameMessage,
  MAX_MESSAGE_BYTES,
  nativeMessage,
  parseGameToNative,
  parseNativeToGame,
  serialize,
} from '@/game/phaser/bridge/protocol';

const level = LEVELS[0]!;

describe('bridge protocol', () => {
  it('round-trips every native → game message type', () => {
    const messages = [
      nativeMessage('LOAD_LEVEL', { level, seed: 1, settings: { reduceMotion: true, highContrast: false } }),
      nativeMessage('START_LEVEL', {}),
      nativeMessage('PAUSE_GAME', {}),
      nativeMessage('RESUME_GAME', {}),
      nativeMessage('USE_BOOSTER', { booster: 'lineRally' }),
      nativeMessage('USE_BOOSTER', { booster: null }),
      nativeMessage('UPDATE_SETTINGS', { reduceMotion: false, highContrast: true }),
      nativeMessage('REQUEST_GAME_STATE', { requestId: 'r1' }),
      nativeMessage('RESTART_LEVEL', { seed: 99 }),
    ];
    for (const message of messages) {
      expect(parseNativeToGame(serialize(message))).toEqual({ ok: true, message });
    }
  });

  it('round-trips game → native messages', () => {
    const messages = [
      gameMessage('GAME_READY', { protocolVersion: 1 }),
      gameMessage('MOVES_CHANGED', { movesRemaining: 3, moveLimit: 12 }),
      gameMessage('SCORE_CHANGED', { score: 120, delta: 120 }),
      gameMessage('SOUND_EVENT', { sound: 'match' }),
      gameMessage('HAPTIC_EVENT', { kind: 'success' }),
      gameMessage('BOOSTER_STATE_CHANGED', {
        inventory: { lineRally: 1, campusBurst: 0, colorRally: 0 },
        armed: null,
      }),
      gameMessage('LEVEL_WON', {
        levelId: 'level-001',
        score: 2000,
        stars: 2,
        movesUsed: 7,
        movesRemaining: 5,
        winBonus: 750,
        objectives: [
          { definition: { type: 'makeMatches', target: 5 }, current: 5, target: 5, completed: true },
        ],
      }),
      gameMessage('GAME_ERROR', { code: 'X', message: 'y' }),
    ];
    for (const message of messages) {
      expect(parseGameToNative(serialize(message))).toEqual({ ok: true, message });
    }
  });

  it('rejects unknown types, wrong versions, bad payloads and junk', () => {
    const bad: unknown[] = [
      '{"v":1,"type":"DELETE_EVERYTHING","payload":{}}',
      '{"v":2,"type":"START_LEVEL","payload":{}}',
      '{"v":1,"type":"START_LEVEL","payload":{"extra":true}}',
      '{"v":1,"type":"USE_BOOSTER","payload":{"booster":"megaBomb"}}',
      '{"v":1,"type":"RESTART_LEVEL","payload":{"seed":-1}}',
      '{"v":1,"type":"LOAD_LEVEL","payload":{"level":{"id":"x"},"seed":1}}',
      'not json',
      42,
      null,
    ];
    for (const raw of bad) expect(parseNativeToGame(raw).ok).toBe(false);
    expect(parseGameToNative('{"v":1,"type":"SOUND_EVENT","payload":{"sound":"airhorn"}}').ok).toBe(false);
    expect(parseGameToNative('{"v":1,"type":"SCORE_CHANGED","payload":{"score":-5,"delta":0}}').ok).toBe(
      false,
    );
  });

  it('rejects oversized messages before parsing', () => {
    const huge = JSON.stringify({
      v: 1,
      type: 'START_LEVEL',
      payload: {},
      pad: 'x'.repeat(MAX_MESSAGE_BYTES),
    });
    expect(parseNativeToGame(huge)).toEqual({ ok: false, error: 'message too large' });
  });
});
