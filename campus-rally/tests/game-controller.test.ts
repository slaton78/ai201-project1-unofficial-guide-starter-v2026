import { describe, expect, it } from 'vitest';

import { LEVELS } from '@/content/levels';
import { GameSession } from '@/game/core/GameSession';
import { nativeMessage, serialize } from '@/game/phaser/bridge/protocol';
import type { GameToNativeMessage } from '@/game/phaser/bridge/protocol';
import { GameController } from '@/game/phaser/runtime/GameController';
import type { BoardView } from '@/game/phaser/runtime/GameController';

function setup() {
  const sent: GameToNativeMessage[] = [];
  const calls: string[] = [];
  const view: BoardView = {
    showSession: () => calls.push('show'),
    setInputEnabled: (e) => calls.push(`input:${e}`),
    setPaused: (p) => calls.push(`paused:${p}`),
    applySettings: () => calls.push('settings'),
    setArmedBooster: (b) => calls.push(`armed:${b}`),
  };
  const controller = new GameController((m) => sent.push(m));
  return { controller, view, sent, calls, types: () => sent.map((m) => m.type) };
}

const level1 = LEVELS[0]!;
const level5 = LEVELS[4]!;
const send = (c: GameController, m: Parameters<typeof serialize>[0]) => c.receive(serialize(m));

describe('GameController (game side of the bridge)', () => {
  it('announces readiness, then loads and starts a level', () => {
    const { controller, view, types, sent } = setup();
    controller.attachView(view);
    expect(types()).toEqual(['GAME_READY']);
    send(
      controller,
      nativeMessage('LOAD_LEVEL', {
        level: level1,
        seed: 1001,
        settings: { reduceMotion: false, highContrast: false },
      }),
    );
    expect(controller.isPlayable).toBe(false);
    send(controller, nativeMessage('START_LEVEL', {}));
    expect(controller.isPlayable).toBe(true);
    const started = sent.find((m) => m.type === 'LEVEL_STARTED');
    expect(started?.type === 'LEVEL_STARTED' && started.payload.snapshot.movesRemaining).toBe(
      level1.moveLimit,
    );
  });

  it('queues messages that arrive before the scene is ready', () => {
    const { controller, view, types } = setup();
    send(
      controller,
      nativeMessage('LOAD_LEVEL', {
        level: level1,
        seed: 1,
        settings: { reduceMotion: false, highContrast: false },
      }),
    );
    send(controller, nativeMessage('START_LEVEL', {}));
    controller.attachView(view);
    expect(types()).toContain('LEVEL_STARTED');
  });

  it('reports invalid messages as GAME_ERROR without acting on them', () => {
    const { controller, view, sent } = setup();
    controller.attachView(view);
    controller.receive('{"v":1,"type":"START_LEVEL","payload":{"hack":1}}');
    expect(sent.at(-1)?.type).toBe('GAME_ERROR');
    controller.receive('{"v":1,"type":"START_LEVEL","payload":{}}');
    expect(sent.at(-1)).toMatchObject({ type: 'GAME_ERROR', payload: { code: 'NO_LEVEL' } });
  });

  it('pauses and resumes input', () => {
    const { controller, view, calls } = setup();
    controller.attachView(view);
    send(
      controller,
      nativeMessage('LOAD_LEVEL', {
        level: level1,
        seed: 1,
        settings: { reduceMotion: false, highContrast: false },
      }),
    );
    send(controller, nativeMessage('START_LEVEL', {}));
    send(controller, nativeMessage('PAUSE_GAME', {}));
    expect(controller.isPlayable).toBe(false);
    expect(controller.requestSwap({ row: 0, col: 0 }, { row: 0, col: 1 })).toBeNull();
    send(controller, nativeMessage('RESUME_GAME', {}));
    expect(controller.isPlayable).toBe(true);
    expect(calls).toContain('paused:true');
    expect(calls).toContain('paused:false');
  });

  it('plays a legal move and emits moves, score and objective progress', () => {
    const { controller, view, types } = setup();
    controller.attachView(view);
    send(
      controller,
      nativeMessage('LOAD_LEVEL', {
        level: level1,
        seed: 1001,
        settings: { reduceMotion: false, highContrast: false },
      }),
    );
    send(controller, nativeMessage('START_LEVEL', {}));
    const move = new GameSession(level1, 1001).hint()!;
    const outcome = controller.requestSwap(move.from, move.to);
    expect(outcome?.kind).toBe('resolved');
    if (outcome?.kind !== 'resolved') return;
    outcome.steps.forEach((step) => controller.stepAnimated(step, step.scoreDelta));
    controller.outcomeAnimated(outcome);
    expect(types()).toEqual(
      expect.arrayContaining([
        'MOVES_CHANGED',
        'SCORE_CHANGED',
        'OBJECTIVE_PROGRESS_CHANGED',
        'SOUND_EVENT',
        'HAPTIC_EVENT',
      ]),
    );
  });

  it('arms and spends a tray booster', () => {
    const { controller, view, sent } = setup();
    controller.attachView(view);
    send(
      controller,
      nativeMessage('LOAD_LEVEL', {
        level: level5,
        seed: 5,
        settings: { reduceMotion: false, highContrast: false },
      }),
    );
    send(controller, nativeMessage('START_LEVEL', {}));
    send(controller, nativeMessage('USE_BOOSTER', { booster: 'lineRally' }));
    expect(controller.armedBooster).toBe('lineRally');
    expect(controller.requestBooster({ row: 4, col: 4 })?.kind).toBe('resolved');
    expect(controller.armedBooster).toBeNull();
    const last = sent.filter((m) => m.type === 'BOOSTER_STATE_CHANGED').at(-1);
    expect(last?.type === 'BOOSTER_STATE_CHANGED' && last.payload.inventory.lineRally).toBe(0);
    // An empty booster cannot be armed.
    send(controller, nativeMessage('USE_BOOSTER', { booster: 'lineRally' }));
    expect(controller.armedBooster).toBeNull();
  });

  it('answers state requests', () => {
    const { controller, view, sent } = setup();
    controller.attachView(view);
    send(controller, nativeMessage('REQUEST_GAME_STATE', { requestId: 'q' }));
    expect(sent.at(-1)).toMatchObject({
      type: 'GAME_STATE_RESPONSE',
      payload: { requestId: 'q', snapshot: null },
    });
  });
});
