import type Phaser from 'phaser';

/** Animation timings (ms). Reduce Motion shortens everything and removes bounces. */
export function durations(reduceMotion: boolean) {
  const k = reduceMotion ? 0.5 : 1;
  return {
    swap: Math.round(130 * k),
    clear: Math.round(150 * k),
    pop: Math.round(160 * k),
    fall: (cells: number) => Math.round((90 + Math.min(cells, 8) * 35) * k),
    callout: reduceMotion ? 450 : 520,
    winPause: reduceMotion ? 250 : 500,
  };
}

/** Promise wrapper around a tween so animation sequences read top to bottom. */
export function playTween(
  scene: Phaser.Scene,
  config: Phaser.Types.Tweens.TweenBuilderConfig,
): Promise<void> {
  return new Promise((resolve) => {
    scene.tweens.add({
      ...config,
      onComplete: (...args) => {
        const original = config.onComplete as ((...a: unknown[]) => void) | undefined;
        original?.(...args);
        resolve();
      },
    });
  });
}

export function wait(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => {
    scene.time.delayedCall(ms, () => resolve());
  });
}
