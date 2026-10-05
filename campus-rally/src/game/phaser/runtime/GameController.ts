import { GameSession } from '@/game/core/GameSession';
import type { GameSnapshot, MoveOutcome } from '@/game/core/GameSession';
import type { Move } from '@/game/core/MoveValidator';
import type { BoosterType, CascadeStep, Position } from '@/game/core/types';
import { gameMessage, parseNativeToGame, PROTOCOL_VERSION } from '@/game/phaser/bridge/protocol';
import type {
  GameStateSnapshot,
  GameToNativeMessage,
  NativeToGameMessage,
  RenderSettings,
} from '@/game/phaser/bridge/protocol';

/** Copies the session snapshot into the plain (mutable) shape the protocol schema describes. */
function wireSnapshot(snapshot: GameSnapshot): GameStateSnapshot {
  return { ...snapshot, objectives: [...snapshot.objectives], boosters: { ...snapshot.boosters } };
}

/** What the controller needs from the renderer. Implemented by BoardScene. */
export interface BoardView {
  showSession(session: GameSession, settings: RenderSettings): void;
  setInputEnabled(enabled: boolean): void;
  setPaused(paused: boolean): void;
  applySettings(settings: RenderSettings): void;
  setArmedBooster(booster: BoosterType | null): void;
}

/**
 * Owns the GameSession inside the WebView and translates between protocol messages and the
 * renderer. Contains no drawing code, so it can be unit-tested without Phaser.
 */
export class GameController {
  private session: GameSession | null = null;
  private view: BoardView | null = null;
  private settings: RenderSettings = { reduceMotion: false, highContrast: false };
  private started = false;
  private paused = false;
  private armed: BoosterType | null = null;
  private pending: NativeToGameMessage[] = [];

  constructor(private readonly send: (message: GameToNativeMessage) => void) {}

  attachView(view: BoardView): void {
    this.view = view;
    const queued = this.pending;
    this.pending = [];
    queued.forEach((m) => this.handle(m));
    this.send(gameMessage('GAME_READY', { protocolVersion: PROTOCOL_VERSION }));
  }

  /** Entry point for raw inbound data. Invalid messages are rejected and reported. */
  receive(raw: unknown): void {
    const parsed = parseNativeToGame(raw);
    if (!parsed.ok) {
      this.send(gameMessage('GAME_ERROR', { code: 'INVALID_MESSAGE', message: parsed.error.slice(0, 500) }));
      return;
    }
    if (!this.view) {
      this.pending.push(parsed.message);
      return;
    }
    this.handle(parsed.message);
  }

  private handle(message: NativeToGameMessage): void {
    const view = this.view;
    if (!view) return;
    switch (message.type) {
      case 'LOAD_LEVEL': {
        this.settings = message.payload.settings;
        this.startSession(message.payload.level, message.payload.seed, false);
        break;
      }
      case 'START_LEVEL': {
        if (!this.session) {
          this.error('NO_LEVEL', 'START_LEVEL received before LOAD_LEVEL');
          return;
        }
        this.started = true;
        view.setInputEnabled(!this.paused);
        this.send(gameMessage('LEVEL_STARTED', { snapshot: wireSnapshot(this.session.snapshot()) }));
        break;
      }
      case 'RESTART_LEVEL': {
        if (!this.session) return;
        this.startSession(this.session.level, message.payload.seed, true);
        break;
      }
      case 'PAUSE_GAME':
        this.paused = true;
        view.setPaused(true);
        view.setInputEnabled(false);
        break;
      case 'RESUME_GAME':
        this.paused = false;
        view.setPaused(false);
        view.setInputEnabled(this.started && this.session?.snapshot().status === 'playing');
        break;
      case 'USE_BOOSTER': {
        const booster = message.payload.booster;
        const available = booster === null || (this.session?.snapshot().boosters[booster] ?? 0) > 0;
        this.armed = available ? booster : null;
        view.setArmedBooster(this.armed);
        this.emitBoosters();
        break;
      }
      case 'UPDATE_SETTINGS':
        this.settings = message.payload;
        view.applySettings(this.settings);
        break;
      case 'REQUEST_GAME_STATE':
        this.send(
          gameMessage('GAME_STATE_RESPONSE', {
            requestId: message.payload.requestId,
            snapshot: this.session ? wireSnapshot(this.session.snapshot()) : null,
          }),
        );
        break;
    }
  }

  private startSession(level: GameSession['level'], seed: number, autoStart: boolean): void {
    try {
      this.session = new GameSession(level, seed);
    } catch (error) {
      this.error('LEVEL_LOAD_FAILED', error instanceof Error ? error.message : 'Unknown error');
      return;
    }
    this.armed = null;
    this.started = autoStart;
    this.view?.showSession(this.session, this.settings);
    this.view?.setArmedBooster(null);
    this.view?.setInputEnabled(autoStart && !this.paused);
    if (autoStart)
      this.send(gameMessage('LEVEL_STARTED', { snapshot: wireSnapshot(this.session.snapshot()) }));
  }

  // ---- Called by the renderer --------------------------------------------------------------

  get armedBooster(): BoosterType | null {
    return this.armed;
  }

  get isPlayable(): boolean {
    return this.started && !this.paused && this.session?.snapshot().status === 'playing';
  }

  requestSwap(a: Position, b: Position): MoveOutcome | null {
    if (!this.session || !this.isPlayable) return null;
    const outcome = this.session.trySwap(a, b);
    if (outcome.kind === 'rejected') {
      this.send(gameMessage('SOUND_EVENT', { sound: 'invalid' }));
      this.send(gameMessage('HAPTIC_EVENT', { kind: 'warning' }));
    } else {
      this.send(gameMessage('SOUND_EVENT', { sound: 'swap' }));
      this.send(gameMessage('HAPTIC_EVENT', { kind: 'selection' }));
      const snap = outcome.snapshot;
      this.send(
        gameMessage('MOVES_CHANGED', { movesRemaining: snap.movesRemaining, moveLimit: snap.moveLimit }),
      );
    }
    return outcome;
  }

  requestBooster(target: Position): MoveOutcome | null {
    if (!this.session || !this.isPlayable || !this.armed) return null;
    const outcome = this.session.useBooster(this.armed, target);
    if (outcome.kind === 'resolved') {
      this.armed = null;
      this.view?.setArmedBooster(null);
      this.send(gameMessage('SOUND_EVENT', { sound: 'booster' }));
      this.send(gameMessage('HAPTIC_EVENT', { kind: 'heavy' }));
      this.emitBoosters();
    } else {
      this.send(gameMessage('SOUND_EVENT', { sound: 'invalid' }));
    }
    return outcome;
  }

  /** Feedback for input that can never be a move (e.g. touching a Locked Token). */
  rejectInput(): void {
    this.send(gameMessage('SOUND_EVENT', { sound: 'invalid' }));
    this.send(gameMessage('HAPTIC_EVENT', { kind: 'warning' }));
  }

  hint(): Move | null {
    return this.isPlayable ? (this.session?.hint() ?? null) : null;
  }

  hintShown(kind: 'suggested_move' | 'combo_callout', text?: string): void {
    this.send(gameMessage('HINT_SHOWN', text ? { kind, text } : { kind }));
  }

  /** Renderer finished animating one cascade step. `score` is the running total. */
  stepAnimated(step: CascadeStep, score: number): void {
    this.send(gameMessage('SCORE_CHANGED', { score, delta: step.scoreDelta }));
    const special = step.specialsCreated.length > 0 || step.specialsTriggered.length > 0;
    this.send(
      gameMessage('SOUND_EVENT', { sound: special ? 'special' : step.index > 0 ? 'cascade' : 'match' }),
    );
    this.send(gameMessage('HAPTIC_EVENT', { kind: special ? 'medium' : 'light' }));
  }

  /** Renderer finished the whole move. Emits objective progress and any win/loss. */
  outcomeAnimated(outcome: Extract<MoveOutcome, { kind: 'resolved' }>): void {
    const snap = outcome.snapshot;
    this.send(gameMessage('SCORE_CHANGED', { score: snap.score, delta: outcome.winBonus }));
    this.send(
      gameMessage('OBJECTIVE_PROGRESS_CHANGED', {
        objectives: [...snap.objectives],
        newlyCompleted: [...outcome.newlyCompletedObjectives],
      }),
    );
    if (outcome.newlyCompletedObjectives.length > 0 && snap.status === 'playing') {
      this.send(gameMessage('SOUND_EVENT', { sound: 'objective' }));
    }
    if (snap.status === 'playing') return;
    this.view?.setInputEnabled(false);
    const result = {
      levelId: snap.levelId,
      score: snap.score,
      stars: snap.stars,
      movesUsed: snap.movesMade,
      movesRemaining: snap.movesRemaining,
      winBonus: outcome.winBonus,
      objectives: [...snap.objectives],
    };
    if (snap.status === 'won') {
      this.send(gameMessage('SOUND_EVENT', { sound: 'win' }));
      this.send(gameMessage('HAPTIC_EVENT', { kind: 'success' }));
      this.send(gameMessage('LEVEL_WON', result));
    } else {
      this.send(gameMessage('SOUND_EVENT', { sound: 'lose' }));
      this.send(gameMessage('HAPTIC_EVENT', { kind: 'warning' }));
      this.send(gameMessage('LEVEL_LOST', result));
    }
  }

  private emitBoosters(): void {
    if (!this.session) return;
    this.send(
      gameMessage('BOOSTER_STATE_CHANGED', {
        inventory: { ...this.session.snapshot().boosters },
        armed: this.armed,
      }),
    );
  }

  error(code: string, message: string): void {
    this.send(gameMessage('GAME_ERROR', { code, message: message.slice(0, 500) }));
  }
}
