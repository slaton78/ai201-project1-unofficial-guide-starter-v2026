import Phaser from 'phaser';

import { getCell, isAdjacent, posKey, swapTokens } from '@/game/core/Board';
import type { GameSession, MoveOutcome } from '@/game/core/GameSession';
import type { BoardState, BoosterType, CascadeStep, Position, Token } from '@/game/core/types';
import type { RenderSettings } from '@/game/phaser/bridge/protocol';
import type { BoardView, GameController } from '@/game/phaser/runtime/GameController';
import { calloutForSteps } from '@/game/shared/callouts';

import { createTextures } from './textures';
import type { TextureSet } from './textures';
import { durations, playTween, wait } from './tweens';

type Resolved = Extract<MoveOutcome, { kind: 'resolved' }>;

interface TokenView {
  container: Phaser.GameObjects.Container;
  image: Phaser.GameObjects.Image;
  lock: Phaser.GameObjects.Image | null;
}

const DEFAULT_HINT_DELAY_S = 20;

/**
 * Renders the board and turns pointer input into swap/booster requests. All rules live in
 * GameSession (via GameController); this scene only animates the results.
 */
export class BoardScene extends Phaser.Scene implements BoardView {
  private controller!: GameController;
  private session: GameSession | null = null;
  private settings: RenderSettings = { reduceMotion: false, highContrast: false };
  private textures_: TextureSet | null = null;
  private cell = 64;
  private pad = 8;

  private boardLayer!: Phaser.GameObjects.Container;
  private tileLayer!: Phaser.GameObjects.Container;
  private blockLayer!: Phaser.GameObjects.Container;
  private tokenLayer!: Phaser.GameObjects.Container;
  private fxLayer!: Phaser.GameObjects.Container;

  private tokens = new Map<number, TokenView>();
  private tiles = new Map<string, Phaser.GameObjects.Image>();
  private blocks = new Map<string, Phaser.GameObjects.Image>();
  private selection: Phaser.GameObjects.Image | null = null;
  private hintMarks: Phaser.GameObjects.Image[] = [];
  private hintTimer: Phaser.Time.TimerEvent | null = null;
  private armedBanner: Phaser.GameObjects.Text | null = null;

  private viewBoard: BoardState | null = null;
  private selected: Position | null = null;
  private dragStart: { pos: Position; x: number; y: number } | null = null;
  private inputEnabled = false;
  private busy = false;
  private paused = false;
  private armed: BoosterType | null = null;

  constructor() {
    super('board');
  }

  init(data: { controller: GameController }): void {
    this.controller = data.controller;
  }

  create(): void {
    this.boardLayer = this.add.container(0, 0);
    this.tileLayer = this.add.container(0, 0);
    this.blockLayer = this.add.container(0, 0);
    this.tokenLayer = this.add.container(0, 0);
    this.fxLayer = this.add.container(0, 0);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', () => {
      this.dragStart = null;
    });
    this.controller.attachView(this);
  }

  // ---- BoardView ---------------------------------------------------------------------------

  showSession(session: GameSession, settings: RenderSettings): void {
    this.session = session;
    this.settings = settings;
    this.busy = false;
    this.selected = null;
    this.layout(session.board);
    this.rebuild(session.board);
    this.scheduleHint();
  }

  setInputEnabled(enabled: boolean): void {
    this.inputEnabled = enabled;
    if (enabled) this.scheduleHint();
    else this.clearHint();
  }

  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) {
      this.tweens.pauseAll();
      this.time.paused = true;
    } else {
      this.tweens.resumeAll();
      this.time.paused = false;
    }
  }

  applySettings(settings: RenderSettings): void {
    const contrastChanged = settings.highContrast !== this.settings.highContrast;
    this.settings = settings;
    if (contrastChanged && this.session && !this.busy) {
      this.textures_ = createTextures(this, this.cell, settings.highContrast);
      this.rebuild(this.session.board);
    }
  }

  setArmedBooster(booster: BoosterType | null): void {
    this.armed = booster;
    this.clearSelection();
    this.armedBanner?.destroy();
    this.armedBanner = null;
    if (booster) {
      const size = this.scale.gameSize.width;
      this.armedBanner = this.add
        .text(size / 2, this.pad * 0.5, 'Tap a token to aim', {
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          fontSize: `${Math.round(this.cell * 0.32)}px`,
          fontStyle: 'bold',
          color: '#1A1300',
          backgroundColor: '#FFC94A',
          padding: { x: 12, y: 6 },
        })
        .setOrigin(0.5, 0)
        .setDepth(10);
    }
  }

  // ---- Layout & rebuild ----------------------------------------------------------------------

  private layout(board: BoardState): void {
    const size = Math.min(this.scale.gameSize.width, this.scale.gameSize.height);
    this.pad = Math.round(size * 0.02);
    this.cell = (size - this.pad * 2) / Math.max(board.width, board.height);
    this.textures_ = createTextures(this, this.cell, this.settings.highContrast);
  }

  private center(pos: Position): { x: number; y: number } {
    return {
      x: this.pad + pos.col * this.cell + this.cell / 2,
      y: this.pad + pos.row * this.cell + this.cell / 2,
    };
  }

  private cellAt(x: number, y: number): Position | null {
    const board = this.session?.board;
    if (!board) return null;
    const col = Math.floor((x - this.pad) / this.cell);
    const row = Math.floor((y - this.pad) / this.cell);
    if (row < 0 || col < 0 || row >= board.height || col >= board.width) return null;
    return { row, col };
  }

  /** Snaps every sprite to `board` without animation. Also used to self-heal after a move. */
  private rebuild(board: BoardState): void {
    const tex = this.textures_;
    if (!tex) return;
    for (const layer of [this.boardLayer, this.tileLayer, this.blockLayer, this.tokenLayer, this.fxLayer]) {
      layer.removeAll(true);
    }
    this.tokens.clear();
    this.tiles.clear();
    this.blocks.clear();
    this.selection = null;
    this.hintMarks = [];

    const size = this.cell * board.width + this.pad * 2;
    const panel = this.add.graphics();
    panel.fillStyle(this.settings.highContrast ? 0x000000 : 0x0e1a3a, this.settings.highContrast ? 1 : 0.92);
    panel.fillRoundedRect(0, 0, size, size, this.pad * 1.5);
    panel.lineStyle(this.settings.highContrast ? 4 : 2, this.settings.highContrast ? 0xffffff : 0x34508f, 1);
    panel.strokeRoundedRect(1, 1, size - 2, size - 2, this.pad * 1.5);
    this.boardLayer.add(panel);

    for (let row = 0; row < board.height; row += 1) {
      for (let col = 0; col < board.width; col += 1) {
        const pos = { row, col };
        const { x, y } = this.center(pos);
        const cellImage = this.add
          .image(x, y, (row + col) % 2 === 0 ? tex.cellA : tex.cellB)
          .setDisplaySize(this.cell, this.cell);
        this.boardLayer.add(cellImage);
        const cell = getCell(board, pos);
        if (cell.rallyTile) {
          const tile = this.add.image(x, y, tex.tile);
          this.tileLayer.add(tile);
          this.tiles.set(posKey(pos), tile);
        }
        if (cell.obstacle) {
          const block = this.add.image(x, y, cell.obstacle.hits >= 2 ? tex.block2 : tex.block1);
          this.blockLayer.add(block);
          this.blocks.set(posKey(pos), block);
        }
        if (cell.token) this.addToken(cell.token, pos);
      }
    }
    this.viewBoard = board;
  }

  private addToken(token: Token, pos: Position, offsetRows = 0): TokenView {
    const tex = this.textures_ as TextureSet;
    const { x, y } = this.center(pos);
    const image = this.add.image(0, 0, tex.token(token));
    const container = this.add.container(x, y - offsetRows * this.cell, [image]);
    let lock: Phaser.GameObjects.Image | null = null;
    if (token.locked) {
      lock = this.add.image(0, 0, tex.lock);
      container.add(lock);
    }
    this.tokenLayer.add(container);
    const view = { container, image, lock };
    this.tokens.set(token.id, view);
    return view;
  }

  // ---- Input -----------------------------------------------------------------------------------

  private canAct(): boolean {
    return this.inputEnabled && !this.busy && !this.paused && this.controller.isPlayable;
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.canAct()) return;
    const pos = this.cellAt(pointer.x, pointer.y);
    if (!pos) return;
    this.clearHint();

    if (this.armed) {
      const outcome = this.controller.requestBooster(pos);
      if (outcome?.kind === 'resolved') void this.playOutcome(outcome, null);
      return;
    }

    const token = this.viewBoard ? getCell(this.viewBoard, pos).token : null;
    if (this.selected && isAdjacent(this.selected, pos)) {
      void this.attemptSwap(this.selected, pos);
      return;
    }
    if (!token) {
      this.clearSelection();
      return;
    }
    if (token.locked) {
      this.nudge(pos);
      this.controller.rejectInput();
      this.clearSelection();
      return;
    }
    this.select(pos);
    this.dragStart = { pos, x: pointer.x, y: pointer.y };
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragStart || !pointer.isDown || !this.canAct()) return;
    const dx = pointer.x - this.dragStart.x;
    const dy = pointer.y - this.dragStart.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < this.cell * 0.32) return;
    const from = this.dragStart.pos;
    const to =
      Math.abs(dx) > Math.abs(dy)
        ? { row: from.row, col: from.col + Math.sign(dx) }
        : { row: from.row + Math.sign(dy), col: from.col };
    this.dragStart = null;
    void this.attemptSwap(from, to);
  }

  private select(pos: Position): void {
    const tex = this.textures_ as TextureSet;
    this.selected = pos;
    const { x, y } = this.center(pos);
    if (!this.selection) {
      this.selection = this.add.image(x, y, tex.select);
      this.fxLayer.add(this.selection);
    }
    this.selection.setPosition(x, y).setVisible(true);
  }

  private clearSelection(): void {
    this.selected = null;
    this.selection?.setVisible(false);
  }

  private async attemptSwap(a: Position, b: Position): Promise<void> {
    this.clearSelection();
    const board = this.session?.board;
    if (!board || b.row < 0 || b.col < 0 || b.row >= board.height || b.col >= board.width) return;
    const outcome = this.controller.requestSwap(a, b);
    if (!outcome) return;
    if (outcome.kind === 'rejected') {
      this.busy = true;
      if (outcome.reason === 'no-match') await this.animateInvalidSwap(a, b);
      else this.nudge(a);
      this.busy = false;
      this.scheduleHint();
      return;
    }
    await this.playOutcome(outcome, [a, b]);
  }

  // ---- Animation ---------------------------------------------------------------------------------

  private viewAt(board: BoardState | null, pos: Position): TokenView | undefined {
    const token = board ? getCell(board, pos).token : null;
    return token ? this.tokens.get(token.id) : undefined;
  }

  private async animateInvalidSwap(a: Position, b: Position): Promise<void> {
    const va = this.viewAt(this.viewBoard, a);
    const vb = this.viewAt(this.viewBoard, b);
    if (!va || !vb) return;
    const pa = this.center(a);
    const pb = this.center(b);
    const d = durations(this.settings.reduceMotion);
    const reach = this.settings.reduceMotion ? 0.25 : 1;
    const mid = (from: { x: number; y: number }, to: { x: number; y: number }) => ({
      x: from.x + (to.x - from.x) * reach,
      y: from.y + (to.y - from.y) * reach,
    });
    await Promise.all([
      playTween(this, { targets: va.container, ...mid(pa, pb), duration: d.swap, ease: 'Quad.easeOut' }),
      playTween(this, { targets: vb.container, ...mid(pb, pa), duration: d.swap, ease: 'Quad.easeOut' }),
    ]);
    await Promise.all([
      playTween(this, { targets: va.container, ...pa, duration: d.swap, ease: 'Quad.easeIn' }),
      playTween(this, { targets: vb.container, ...pb, duration: d.swap, ease: 'Quad.easeIn' }),
    ]);
  }

  private nudge(pos: Position): void {
    const view = this.viewAt(this.viewBoard, pos);
    if (!view || this.settings.reduceMotion) return;
    const { x } = this.center(pos);
    this.tweens.add({
      targets: view.container,
      x: x + this.cell * 0.08,
      duration: 50,
      yoyo: true,
      repeat: 2,
      onComplete: () => view.container.setX(x),
    });
  }

  private async playOutcome(outcome: Resolved, swap: [Position, Position] | null): Promise<void> {
    if (!this.viewBoard) return;
    this.busy = true;
    const d = durations(this.settings.reduceMotion);
    let score =
      outcome.snapshot.score - outcome.winBonus - outcome.steps.reduce((s, st) => s + st.scoreDelta, 0);

    if (swap) {
      const [a, b] = swap;
      const va = this.viewAt(this.viewBoard, a);
      const vb = this.viewAt(this.viewBoard, b);
      await Promise.all([
        va
          ? playTween(this, {
              targets: va.container,
              ...this.center(b),
              duration: d.swap,
              ease: 'Quad.easeInOut',
            })
          : null,
        vb
          ? playTween(this, {
              targets: vb.container,
              ...this.center(a),
              duration: d.swap,
              ease: 'Quad.easeInOut',
            })
          : null,
      ]);
      this.viewBoard = swapTokens(this.viewBoard, a, b);
    }

    for (const step of outcome.steps) {
      await this.animateStep(step);
      score += step.scoreDelta;
      this.controller.stepAnimated(step, score);
    }

    const callout = calloutForSteps(outcome.steps);
    if (callout) {
      this.controller.hintShown('combo_callout', callout);
      void this.showCallout(callout);
    }

    if (outcome.reshuffledBoard) {
      await this.showCallout('Fresh board!');
      this.rebuild(outcome.reshuffledBoard);
    } else if (this.session) {
      // Self-heal: guarantees the view matches the authoritative board after every move.
      this.rebuild(this.session.board);
    }

    if (outcome.snapshot.status === 'won') {
      if (!this.settings.reduceMotion) this.celebrate();
      await this.showCallout(
        outcome.winBonus > 0 ? `Rally Bonus +${outcome.winBonus.toLocaleString('en-US')}` : 'Victory!',
      );
      await wait(this, d.winPause);
    } else if (outcome.snapshot.status === 'lost') {
      await this.showCallout('Out of moves');
      await wait(this, d.winPause / 2);
    }

    this.busy = false;
    this.controller.outcomeAnimated(outcome);
    this.scheduleHint();
  }

  private async animateStep(step: CascadeStep): Promise<void> {
    const tex = this.textures_ as TextureSet;
    const d = durations(this.settings.reduceMotion);

    // 1) Clear tokens (+ sparks), unlock, damage blocks, clear tiles.
    const clears = step.cleared.map((c) => {
      const view = this.tokens.get(c.token.id);
      if (!view) return null;
      this.tokens.delete(c.token.id);
      if (!this.settings.reduceMotion) this.sparks(this.center(c.pos), 3);
      return playTween(this, {
        targets: view.container,
        scale: 0.2,
        alpha: 0,
        duration: d.clear,
        ease: 'Back.easeIn',
      }).then(() => view.container.destroy());
    });
    for (const pos of step.unlocked) {
      const view = this.viewAt(this.viewBoard, pos);
      if (view?.lock) {
        const lock = view.lock;
        view.lock = null;
        clears.push(
          playTween(this, { targets: lock, alpha: 0, scale: 1.4, duration: d.clear }).then(() =>
            lock.destroy(),
          ),
        );
      }
    }
    for (const hit of step.obstacleHits) {
      const block = this.blocks.get(posKey(hit.pos));
      if (!block) continue;
      if (hit.remaining <= 0) {
        this.blocks.delete(posKey(hit.pos));
        clears.push(
          playTween(this, { targets: block, alpha: 0, scale: 0.6, duration: d.clear }).then(() =>
            block.destroy(),
          ),
        );
      } else {
        block.setTexture(hit.remaining >= 2 ? tex.block2 : tex.block1);
        if (!this.settings.reduceMotion)
          this.tweens.add({ targets: block, angle: 6, duration: 50, yoyo: true, repeat: 1 });
      }
    }
    for (const pos of step.rallyTilesCleared) {
      const tile = this.tiles.get(posKey(pos));
      if (!tile) continue;
      this.tiles.delete(posKey(pos));
      clears.push(playTween(this, { targets: tile, alpha: 0, duration: d.clear }).then(() => tile.destroy()));
    }
    await Promise.all(clears);

    // 2) Newly created specials pop in.
    await Promise.all(
      step.specialsCreated.map((created) => {
        const view = this.addToken(created.token, created.pos);
        view.container.setScale(this.settings.reduceMotion ? 1 : 0.4);
        return this.settings.reduceMotion
          ? Promise.resolve()
          : playTween(this, { targets: view.container, scale: 1, duration: d.pop, ease: 'Back.easeOut' });
      }),
    );

    // 3) Gravity and refill.
    const moves: Promise<void>[] = [];
    for (const fall of step.falls) {
      const view = this.tokens.get(fall.tokenId);
      if (!view) continue;
      const distance = Math.abs(fall.to.row - fall.from.row);
      moves.push(
        playTween(this, {
          targets: view.container,
          ...this.center(fall.to),
          duration: d.fall(distance),
          ease: 'Cubic.easeIn',
        }),
      );
    }
    for (const spawn of step.spawns) {
      const view = this.addToken(spawn.token, spawn.pos, spawn.dropDistance);
      view.container.setAlpha(0);
      moves.push(
        playTween(this, {
          targets: view.container,
          ...this.center(spawn.pos),
          alpha: 1,
          duration: d.fall(spawn.dropDistance),
          ease: 'Cubic.easeIn',
        }),
      );
    }
    await Promise.all(moves);
    this.viewBoard = step.boardAfter;
  }

  private sparks(at: { x: number; y: number }, count: number): void {
    const tex = this.textures_ as TextureSet;
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const spark = this.add.image(at.x, at.y, tex.spark);
      this.fxLayer.add(spark);
      this.tweens.add({
        targets: spark,
        x: at.x + Math.cos(angle) * this.cell * 0.7,
        y: at.y + Math.sin(angle) * this.cell * 0.7,
        alpha: 0,
        duration: 260,
        onComplete: () => spark.destroy(),
      });
    }
  }

  private celebrate(): void {
    const size = this.scale.gameSize.width;
    for (let i = 0; i < 24; i += 1) this.sparks({ x: Math.random() * size, y: Math.random() * size }, 2);
  }

  private async showCallout(text: string): Promise<void> {
    const d = durations(this.settings.reduceMotion);
    const size = this.scale.gameSize.width;
    const label = this.add
      .text(size / 2, size / 2, text, {
        fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        fontSize: `${Math.round(this.cell * 0.6)}px`,
        fontStyle: '900',
        color: '#FFFFFF',
        stroke: '#0B1630',
        strokeThickness: Math.max(4, this.cell * 0.12),
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(20);
    if (this.settings.reduceMotion) {
      await wait(this, d.callout);
    } else {
      label.setScale(0.5).setAlpha(0);
      await playTween(this, { targets: label, scale: 1, alpha: 1, duration: 160, ease: 'Back.easeOut' });
      await wait(this, d.callout);
    }
    await playTween(this, { targets: label, alpha: 0, duration: 160 });
    label.destroy();
  }

  // ---- Hints -------------------------------------------------------------------------------------

  private scheduleHint(): void {
    this.hintTimer?.remove();
    this.hintTimer = null;
    if (!this.session || !this.inputEnabled) return;
    const delay = this.session.level.tutorial?.hintDelaySeconds ?? DEFAULT_HINT_DELAY_S;
    this.hintTimer = this.time.delayedCall(delay * 1000, () => this.showHint());
  }

  private showHint(): void {
    if (!this.canAct()) return;
    const move = this.controller.hint();
    if (!move) return;
    const tex = this.textures_ as TextureSet;
    this.clearHint();
    for (const pos of [move.from, move.to]) {
      const { x, y } = this.center(pos);
      const mark = this.add.image(x, y, tex.hint);
      this.fxLayer.add(mark);
      this.hintMarks.push(mark);
      if (!this.settings.reduceMotion) {
        this.tweens.add({ targets: mark, alpha: 0.35, duration: 520, yoyo: true, repeat: -1 });
      }
    }
    this.controller.hintShown('suggested_move');
  }

  private clearHint(): void {
    for (const mark of this.hintMarks) {
      this.tweens.killTweensOf(mark);
      mark.destroy();
    }
    this.hintMarks = [];
    this.hintTimer?.remove();
    this.hintTimer = null;
  }
}
