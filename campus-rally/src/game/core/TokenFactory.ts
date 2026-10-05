import type { Rng } from './random';
import type { SpecialKind, Token, TokenColor } from './types';

export interface TokenOptions {
  special?: SpecialKind | null;
  locked?: boolean;
}

/** Creates tokens with unique ids, drawing colors from the level's allowed set. */
export class TokenFactory {
  private nextId: number;

  constructor(
    private readonly rng: Rng,
    readonly colors: readonly TokenColor[],
    firstId = 1,
  ) {
    if (colors.length < 3) {
      throw new Error('A level needs at least three token types to guarantee playable boards');
    }
    this.nextId = firstId;
  }

  create(color: TokenColor, options: TokenOptions = {}): Token {
    const token: Token = {
      id: this.nextId,
      color,
      special: options.special ?? null,
      locked: options.locked ?? false,
    };
    this.nextId += 1;
    return token;
  }

  /** Random token, optionally avoiding some colors (used to prevent initial matches). */
  random(avoid: ReadonlySet<TokenColor> = new Set(), options: TokenOptions = {}): Token {
    const candidates = this.colors.filter((color) => !avoid.has(color));
    const pool = candidates.length > 0 ? candidates : this.colors;
    return this.create(this.rng.pick(pool), options);
  }

  /** Same token identity (id/special/locked) with a fresh random color. Used by reshuffles. */
  recolor(token: Token, avoid: ReadonlySet<TokenColor>): Token {
    const candidates = this.colors.filter((color) => !avoid.has(color));
    const pool = candidates.length > 0 ? candidates : this.colors;
    return { ...token, color: this.rng.pick(pool) };
  }
}
