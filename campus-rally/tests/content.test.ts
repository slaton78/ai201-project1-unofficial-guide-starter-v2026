import { describe, expect, it } from 'vitest';

import { CAMPUSES, DEFAULT_CAMPUS_ID, getCampus } from '@/content/campuses';
import { getTrailStop, LEVEL_ORDER, TRAIL_STOPS } from '@/content/trail';

/** WCAG relative luminance contrast ratio between two #RRGGBB colors. */
function contrast(a: string, b: string): number {
  const lum = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    }) as [number, number, number];
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

describe('campus content', () => {
  it('defines five unique fictional campuses', () => {
    expect(CAMPUSES).toHaveLength(5);
    expect(new Set(CAMPUSES.map((c) => c.id)).size).toBe(5);
    expect(new Set(CAMPUSES.map((c) => c.emblem)).size).toBe(5);
  });

  it('uses valid colors with readable text on the primary color (WCAG AA)', () => {
    for (const campus of CAMPUSES) {
      for (const color of Object.values(campus.colors)) expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      expect(contrast(campus.colors.primary, campus.colors.onPrimary)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('falls back to the default campus for unknown ids', () => {
    expect(getCampus('nope').id).toBe(DEFAULT_CAMPUS_ID);
    expect(getCampus(null).id).toBe(DEFAULT_CAMPUS_ID);
    expect(getCampus('harbor-comets').name).toBe('Harbor Comets');
  });
});

describe('Championship Trail manifest', () => {
  it('has ten sequential stops with save-compatible ids', () => {
    expect(TRAIL_STOPS).toHaveLength(10);
    TRAIL_STOPS.forEach((stop, i) => {
      expect(stop.levelNumber).toBe(i + 1);
      expect(stop.id).toMatch(/^level-\d{3}$/);
    });
    expect(new Set(LEVEL_ORDER).size).toBe(10);
    expect(getTrailStop('level-010')?.title).toBe('Rivalry Rush');
    expect(getTrailStop('level-011')).toBeUndefined();
  });
});
