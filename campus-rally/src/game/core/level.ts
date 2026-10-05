import { z } from 'zod';

import { BOOSTER_TYPES, TOKEN_COLORS } from './types';
import type { BoosterType, TokenColor } from './types';

/**
 * Level definition schema. Levels are authored as JSON in `src/content/levels` and validated
 * with this schema both at build/test time and when the game receives a LOAD_LEVEL message.
 *
 * Layout legend (one string per row, `width` characters each) — see docs/content-authoring.md:
 *   .  normal cell             T  Rally Tile under a random token
 *   #  Penalty Block (1 hit)   %  Double Penalty Block (2 hits)
 *   L  Locked Token            K  Locked Token on a Rally Tile
 */
export const LAYOUT_CHARS = ['.', 'T', '#', '%', 'L', 'K'] as const;

const tokenColorSchema = z.enum(TOKEN_COLORS);
const boosterTypeSchema = z.enum(['lineRally', 'campusBurst', 'colorRally']);
const target = z.number().int().positive().max(100000);

export const objectiveSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('makeMatches'), target }),
  z.object({ type: z.literal('clearRallyTiles'), target }),
  z.object({ type: z.literal('reachScore'), target }),
  z.object({ type: z.literal('clearPenaltyBlocks'), target }),
  z.object({ type: z.literal('collectTokens'), color: tokenColorSchema, target }),
  z.object({ type: z.literal('unlockTokens'), target }),
]);
export type ObjectiveDefinition = z.infer<typeof objectiveSchema>;
export type ObjectiveType = ObjectiveDefinition['type'];

const boosterCounts = z.object({
  lineRally: z.number().int().min(0).max(9).optional(),
  campusBurst: z.number().int().min(0).max(9).optional(),
  colorRally: z.number().int().min(0).max(9).optional(),
});

export const levelSchema = z
  .object({
    id: z.string().regex(/^level-\d{3}$/),
    chapterId: z.string().min(1),
    levelNumber: z.number().int().positive(),
    title: z.string().min(1).max(40),
    board: z.object({
      width: z.number().int().min(5).max(10),
      height: z.number().int().min(5).max(10),
      layout: z.array(z.string()).optional(),
    }),
    tokenTypes: z.array(tokenColorSchema).min(3).max(6),
    moveLimit: z.number().int().min(1).max(99),
    objectives: z.array(objectiveSchema).min(1).max(3),
    boosters: z.object({
      /** Booster families that combos may create on this level (progressive unlock). */
      unlocked: z.array(boosterTypeSchema),
      /** Free boosters placed in the tray at level start. Never sold. */
      starting: boosterCounts,
      /** Booster featured on the pre-game screen ("recommended"). */
      recommended: boosterTypeSchema.optional(),
    }),
    starThresholds: z.tuple([target, target, target]),
    tutorial: z
      .object({
        /** Short instruction cards shown before and during play. Plain text: also read by screen readers. */
        tips: z.array(z.string().min(1).max(140)).min(1).max(4),
        /** Seconds of inactivity before the game highlights a suggested move. */
        hintDelaySeconds: z.number().min(1).max(60),
      })
      .optional(),
    theme: z.object({
      name: z.string().min(1).max(40),
      backdrop: z.enum(['night', 'dusk', 'dawn']),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }),
    /** Optional fixed seed for a reproducible board (used by tutorial levels). */
    seed: z.number().int().nonnegative().optional(),
  })
  .superRefine((level, ctx) => {
    const [one, two, three] = level.starThresholds;
    if (!(one < two && two < three)) {
      ctx.addIssue({ code: 'custom', message: 'starThresholds must be strictly increasing' });
    }
    const layout = level.board.layout;
    if (layout) {
      if (layout.length !== level.board.height) {
        ctx.addIssue({ code: 'custom', message: 'layout must have one string per board row' });
      }
      layout.forEach((row, index) => {
        if (row.length !== level.board.width) {
          ctx.addIssue({ code: 'custom', message: `layout row ${index} has the wrong width` });
        }
        if ([...row].some((ch) => !(LAYOUT_CHARS as readonly string[]).includes(ch))) {
          ctx.addIssue({ code: 'custom', message: `layout row ${index} has an unknown character` });
        }
      });
    }
    for (const objective of level.objectives) {
      if (objective.type === 'collectTokens' && !level.tokenTypes.includes(objective.color)) {
        ctx.addIssue({ code: 'custom', message: `collect color ${objective.color} is not in play` });
      }
    }
  });

export type LevelDefinition = z.infer<typeof levelSchema>;

export function parseLevel(input: unknown): LevelDefinition {
  return levelSchema.parse(input);
}

export function startingBoosters(level: LevelDefinition): Record<BoosterType, number> {
  return {
    lineRally: level.boosters.starting.lineRally ?? 0,
    campusBurst: level.boosters.starting.campusBurst ?? 0,
    colorRally: level.boosters.starting.colorRally ?? 0,
  };
}

export function isBoosterType(value: unknown): value is BoosterType {
  return typeof value === 'string' && (BOOSTER_TYPES as readonly string[]).includes(value);
}

export function isTokenColor(value: unknown): value is TokenColor {
  return typeof value === 'string' && (TOKEN_COLORS as readonly string[]).includes(value);
}

export interface LayoutCellSpec {
  rallyTile: boolean;
  blockHits: number;
  locked: boolean;
}

export function layoutCell(level: LevelDefinition, row: number, col: number): LayoutCellSpec {
  const ch = level.board.layout?.[row]?.[col] ?? '.';
  return {
    rallyTile: ch === 'T' || ch === 'K',
    blockHits: ch === '#' ? 1 : ch === '%' ? 2 : 0,
    locked: ch === 'L' || ch === 'K',
  };
}
