import Phaser from 'phaser';

import { serialize } from '@/game/phaser/bridge/protocol';
import { BoardScene } from '@/game/phaser/scenes/BoardScene';

import { GameController } from './GameController';
import { createHostTransport } from './transport';

/**
 * Entry point of the game bundle loaded inside the WebView. Built by scripts/build-game.mjs
 * into a single inline HTML document (no network access needed at runtime).
 */
function boot(): void {
  const transport = createHostTransport();
  const controller = new GameController((message) => transport.post(serialize(message)));
  transport.onMessage((raw) => controller.receive(raw));

  window.addEventListener('error', (event) => {
    controller.error('UNCAUGHT', String(event.message ?? 'Unknown error'));
  });
  window.addEventListener('unhandledrejection', (event) => {
    controller.error('UNHANDLED_REJECTION', String((event as PromiseRejectionEvent).reason ?? 'Unknown'));
  });

  const cssSize = Math.max(240, Math.min(window.innerWidth, window.innerHeight) || 360);
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const size = Math.min(1600, Math.round(cssSize * dpr));

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    width: size,
    height: size,
    transparent: true,
    banner: false,
    disableContextMenu: true,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    input: { activePointers: 1 },
    render: { antialias: true, powerPreference: 'low-power' },
  });
  game.scene.add('board', BoardScene, true, { controller });
}

boot();
