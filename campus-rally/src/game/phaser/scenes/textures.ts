import Phaser from 'phaser';

import { TOKEN_COLORS } from '@/game/core/types';
import type { SpecialKind, Token, TokenColor } from '@/game/core/types';
import { shapePoints, TOKEN_ART } from '@/game/shared/tokenArt';

/**
 * All board art is drawn procedurally at runtime (no image files), at the exact cell size
 * so it stays crisp on every screen density. See docs/asset-attribution.md.
 */
export interface TextureSet {
  token(token: Pick<Token, 'color' | 'special'>): string;
  readonly lock: string;
  readonly block1: string;
  readonly block2: string;
  readonly tile: string;
  readonly cellA: string;
  readonly cellB: string;
  readonly select: string;
  readonly hint: string;
  readonly spark: string;
}

const SPECIALS: SpecialKind[] = ['lineRow', 'lineColumn', 'burst'];
const hex = (color: string): number => Number.parseInt(color.replace('#', ''), 16);

function drawShape(
  g: Phaser.GameObjects.Graphics,
  color: TokenColor,
  cx: number,
  cy: number,
  r: number,
  hc: boolean,
) {
  const art = TOKEN_ART[color];
  const outline = hc ? 0xffffff : hex(art.dark);
  const outlineWidth = hc ? Math.max(3, r * 0.16) : Math.max(2, r * 0.1);
  const pts = (scale: number, dx = 0, dy = 0) =>
    shapePoints(art.shape, r * scale).map((p) => new Phaser.Math.Vector2(cx + p.x + dx, cy + p.y + dy));

  // Soft drop shadow.
  g.fillStyle(0x000000, 0.28);
  if (art.shape === 'circle') g.fillCircle(cx, cy + r * 0.08, r * 0.9);
  else g.fillPoints(pts(0.88, 0, r * 0.08), true);

  g.fillStyle(hex(art.fill), 1);
  g.lineStyle(outlineWidth, outline, 1);
  if (art.shape === 'circle') {
    g.fillCircle(cx, cy, r * 0.86);
    g.strokeCircle(cx, cy, r * 0.86);
  } else {
    g.fillPoints(pts(0.86), true);
    g.strokePoints(pts(0.86), true, true);
  }
  // Inner bevel in the same shape: a second, shape-specific cue that survives color blindness.
  g.fillStyle(hex(art.light), 0.9);
  if (art.shape === 'circle') g.fillCircle(cx, cy, r * 0.38);
  else g.fillPoints(pts(0.38), true);
  // Gloss highlight.
  g.fillStyle(0xffffff, 0.35);
  g.fillEllipse(cx - r * 0.28, cy - r * 0.38, r * 0.42, r * 0.2);
}

function drawSpecialOverlay(
  g: Phaser.GameObjects.Graphics,
  kind: SpecialKind,
  cx: number,
  cy: number,
  r: number,
) {
  g.lineStyle(Math.max(3, r * 0.12), 0xffffff, 0.95);
  if (kind === 'lineRow' || kind === 'lineColumn') {
    const horizontal = kind === 'lineRow';
    for (const offset of [-0.22, 0.22]) {
      const a = horizontal
        ? { x: cx - r * 0.85, y: cy + r * offset }
        : { x: cx + r * offset, y: cy - r * 0.85 };
      const b = horizontal
        ? { x: cx + r * 0.85, y: cy + r * offset }
        : { x: cx + r * offset, y: cy + r * 0.85 };
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    // Arrowheads point along the clear direction.
    g.fillStyle(0xffffff, 1);
    const s = r * 0.24;
    if (horizontal) {
      g.fillTriangle(cx - r, cy, cx - r + s, cy - s, cx - r + s, cy + s);
      g.fillTriangle(cx + r, cy, cx + r - s, cy - s, cx + r - s, cy + s);
    } else {
      g.fillTriangle(cx, cy - r, cx - s, cy - r + s, cx + s, cy - r + s);
      g.fillTriangle(cx, cy + r, cx - s, cy + r - s, cx + s, cy + r - s);
    }
  } else if (kind === 'burst') {
    g.strokeCircle(cx, cy, r * 0.62);
    g.fillStyle(0xffffff, 1);
    for (let i = 0; i < 8; i += 1) {
      const a = (i * Math.PI) / 4;
      g.fillCircle(cx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95, r * 0.09);
    }
  }
}

function drawColorRally(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, hc: boolean) {
  g.fillStyle(0x000000, 0.3);
  g.fillCircle(cx, cy + r * 0.08, r * 0.9);
  g.fillStyle(0x101a3a, 1);
  g.lineStyle(hc ? Math.max(3, r * 0.16) : Math.max(2, r * 0.1), 0xffffff, 1);
  g.fillCircle(cx, cy, r * 0.86);
  g.strokeCircle(cx, cy, r * 0.86);
  TOKEN_COLORS.forEach((color, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / TOKEN_COLORS.length;
    g.fillStyle(hex(TOKEN_ART[color].fill), 1);
    g.fillCircle(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.17);
  });
  g.fillStyle(0xffffff, 1);
  const star = shapePoints('star', r * 0.32).map((p) => new Phaser.Math.Vector2(cx + p.x, cy + p.y));
  g.fillPoints(star, true);
}

export function createTextures(scene: Phaser.Scene, cell: number, highContrast: boolean): TextureSet {
  const prefix = `t${Math.round(cell)}${highContrast ? 'hc' : ''}`;
  const size = Math.ceil(cell);
  const c = size / 2;
  const r = size * 0.42;
  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void): string => {
    const fullKey = `${prefix}-${key}`;
    if (scene.textures.exists(fullKey)) return fullKey;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(fullKey, size, size);
    g.destroy();
    return fullKey;
  };

  for (const color of TOKEN_COLORS) {
    make(`tok-${color}`, (g) => drawShape(g, color, c, c, r, highContrast));
    for (const special of SPECIALS) {
      make(`tok-${color}-${special}`, (g) => {
        drawShape(g, color, c, c, r, highContrast);
        drawSpecialOverlay(g, special, c, c, r);
      });
    }
  }
  make('tok-colorRally', (g) => drawColorRally(g, c, c, r, highContrast));

  const lock = make('lock', (g) => {
    g.lineStyle(Math.max(3, size * 0.06), highContrast ? 0xffffff : 0xd8def0, 0.9);
    g.lineBetween(size * 0.12, size * 0.2, size * 0.88, size * 0.8);
    g.lineBetween(size * 0.88, size * 0.2, size * 0.12, size * 0.8);
    const bx = size * 0.62;
    const by = size * 0.6;
    const bw = size * 0.3;
    g.fillStyle(0x1b2547, 1);
    g.lineStyle(Math.max(2, size * 0.035), 0xffffff, 1);
    g.strokeCircle(bx + bw / 2, by, bw * 0.32);
    g.fillRoundedRect(bx, by, bw, bw * 0.8, size * 0.05);
    g.strokeRoundedRect(bx, by, bw, bw * 0.8, size * 0.05);
  });

  const drawBlock = (g: Phaser.GameObjects.Graphics, hits: number) => {
    const pad = size * 0.06;
    g.fillStyle(hits === 2 ? 0x46506e : 0x5f6b8c, 1);
    g.lineStyle(
      highContrast ? Math.max(3, size * 0.06) : Math.max(2, size * 0.04),
      highContrast ? 0xffffff : 0xb9c3df,
      1,
    );
    g.fillRoundedRect(pad, pad, size - pad * 2, size - pad * 2, size * 0.14);
    g.strokeRoundedRect(pad, pad, size - pad * 2, size - pad * 2, size * 0.14);
    g.lineStyle(Math.max(3, size * 0.07), 0xe8ecf8, 0.9);
    g.lineBetween(size * 0.3, size * 0.3, size * 0.7, size * 0.7);
    g.lineBetween(size * 0.7, size * 0.3, size * 0.3, size * 0.7);
    // Pips show remaining hits without relying on color.
    g.fillStyle(0xffd34d, 1);
    for (let i = 0; i < hits; i += 1)
      g.fillCircle(size * (hits === 1 ? 0.5 : 0.38 + i * 0.24), size * 0.84, size * 0.06);
  };
  const block1 = make('block1', (g) => drawBlock(g, 1));
  const block2 = make('block2', (g) => drawBlock(g, 2));

  const tile = make('tile', (g) => {
    const pad = size * 0.04;
    g.fillStyle(0x4fd1c5, highContrast ? 0.55 : 0.32);
    g.lineStyle(Math.max(2, size * 0.05), highContrast ? 0x00e5ff : 0x4fd1c5, 1);
    g.fillRoundedRect(pad, pad, size - pad * 2, size - pad * 2, size * 0.16);
    g.strokeRoundedRect(pad, pad, size - pad * 2, size - pad * 2, size * 0.16);
  });
  const cellA = make('cellA', (g) => {
    g.fillStyle(highContrast ? 0x111111 : 0x1b2b57, 1);
    g.fillRect(0, 0, size, size);
  });
  const cellB = make('cellB', (g) => {
    g.fillStyle(highContrast ? 0x222222 : 0x223566, 1);
    g.fillRect(0, 0, size, size);
  });
  const select = make('select', (g) => {
    g.lineStyle(Math.max(3, size * 0.07), highContrast ? 0xffe500 : 0xffffff, 1);
    g.strokeRoundedRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9, size * 0.18);
  });
  const hint = make('hint', (g) => {
    g.lineStyle(Math.max(3, size * 0.07), 0xffc94a, 1);
    g.strokeRoundedRect(size * 0.06, size * 0.06, size * 0.88, size * 0.88, size * 0.2);
  });
  const spark = make('spark', (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c, c, size * 0.08);
  });

  return {
    token: (t) => {
      if (t.special === 'colorRally') return `${prefix}-tok-colorRally`;
      return t.special ? `${prefix}-tok-${t.color}-${t.special}` : `${prefix}-tok-${t.color}`;
    },
    lock,
    block1,
    block2,
    tile,
    cellA,
    cellB,
    select,
    hint,
    spark,
  };
}
