import { parseLevel } from '@/game/core/level';
import type { LevelDefinition } from '@/game/core/level';

import level001 from './level-001.json';
import level002 from './level-002.json';
import level003 from './level-003.json';
import level004 from './level-004.json';
import level005 from './level-005.json';
import level006 from './level-006.json';
import level007 from './level-007.json';
import level008 from './level-008.json';
import level009 from './level-009.json';
import level010 from './level-010.json';

/**
 * Ordered Championship Trail. Every level is schema-validated at load time; content tests
 * (tests/content.test.ts) additionally check feasibility of every objective.
 * Adding a level = add a JSON file and append it here (see docs/content-authoring.md).
 */
const RAW_LEVELS: readonly unknown[] = [
  level001,
  level002,
  level003,
  level004,
  level005,
  level006,
  level007,
  level008,
  level009,
  level010,
];

export const LEVELS: readonly LevelDefinition[] = RAW_LEVELS.map((raw) => parseLevel(raw));

export const LEVEL_ORDER: readonly string[] = LEVELS.map((level) => level.id);

export function getLevel(id: string): LevelDefinition | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(id: string): string | undefined {
  return LEVEL_ORDER[LEVEL_ORDER.indexOf(id) + 1];
}
