import type { TokenColor } from '@/game/core/types';

/**
 * Original token art definitions shared by the Phaser renderer and React Native SVG previews.
 * Each token type has a distinct SHAPE (not just a color) for color-blind accessibility.
 */
export type TokenShape = 'circle' | 'diamond' | 'star' | 'triangle' | 'hexagon' | 'square';

export interface TokenArt {
  shape: TokenShape;
  fill: string;
  light: string;
  dark: string;
}

export const TOKEN_ART: Record<TokenColor, TokenArt> = {
  red: { shape: 'circle', fill: '#FF4D5E', light: '#FFB3BA', dark: '#9E1626' },
  blue: { shape: 'diamond', fill: '#3D8BFF', light: '#B5D3FF', dark: '#123F8C' },
  gold: { shape: 'star', fill: '#FFC93C', light: '#FFF0B8', dark: '#9A6B00' },
  green: { shape: 'triangle', fill: '#3DD68C', light: '#B9F5D7', dark: '#0F7346' },
  purple: { shape: 'hexagon', fill: '#A66BFF', light: '#DCC7FF', dark: '#55209E' },
  orange: { shape: 'square', fill: '#FF8A2A', light: '#FFD0A8', dark: '#A04A00' },
};

export interface Point {
  x: number;
  y: number;
}

function regular(sides: number, radius: number, rotation: number): Point[] {
  return Array.from({ length: sides }, (_, i) => {
    const a = rotation + (i * 2 * Math.PI) / sides;
    return { x: Math.cos(a) * radius, y: Math.sin(a) * radius };
  });
}

/** Polygon outline centred on (0,0) with radius ≈ 1. Circle returns an empty list. */
export function shapePoints(shape: TokenShape, scale = 1): Point[] {
  let points: Point[];
  switch (shape) {
    case 'circle':
      return [];
    case 'diamond':
      points = [
        { x: 0, y: -1.05 },
        { x: 0.85, y: 0 },
        { x: 0, y: 1.05 },
        { x: -0.85, y: 0 },
      ];
      break;
    case 'star':
      points = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const r = i % 2 === 0 ? 1.05 : 0.48;
        return { x: Math.cos(a) * r, y: Math.sin(a) * r + 0.06 };
      });
      break;
    case 'triangle':
      points = regular(3, 1.08, -Math.PI / 2).map((p) => ({ x: p.x, y: p.y + 0.18 }));
      break;
    case 'hexagon':
      points = regular(6, 0.98, Math.PI / 6);
      break;
    case 'square':
      points = [
        { x: -0.8, y: -0.8 },
        { x: 0.8, y: -0.8 },
        { x: 0.8, y: 0.8 },
        { x: -0.8, y: 0.8 },
      ];
      break;
  }
  return points.map((p) => ({ x: p.x * scale, y: p.y * scale }));
}
