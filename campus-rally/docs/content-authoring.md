# Content authoring

## Adding or editing a level

1. Copy an existing file in `src/content/levels/` to `level-011.json` (ids are `level-NNN`).
2. Import it in `src/content/levels/index.ts` and append it to `RAW_LEVELS` (array order = trail order).
3. Run `npm test` — `tests/content.test.ts` validates the schema and checks every objective is achievable on the layout.
4. Run `npm run simulate:levels` to see bot win rate and score percentiles, and tune `moveLimit` and `starThresholds`.

The game scales to 60+ levels without code changes: the trail renders `LEVELS`, unlocks follow array order, and every rule is data-driven. For large catalogs, split levels by `chapterId` and (later) serve them from the `levels` table.

## Level JSON reference

```jsonc
{
  "id": "level-004",
  "chapterId": "chapter-01-opening-season",
  "levelNumber": 4,
  "title": "Penalty Box", // ≤ 40 chars
  "board": {
    "width": 8,
    "height": 8,
    "layout": [
      // optional; one string per row
      "........",
      ".#....#.",
      "...",
    ],
  },
  "tokenTypes": ["red", "blue", "gold", "green", "purple"], // 3–6 types; fewer = easier
  "moveLimit": 20,
  "objectives": [{ "type": "clearPenaltyBlocks", "target": 8 }], // 1–3 objectives
  "boosters": {
    "unlocked": ["lineRally"], // combos that may create specials on this level
    "starting": { "lineRally": 1 }, // free tray boosters (never sold)
    "recommended": "lineRally", // optional, shown on the pre-game screen
  },
  "starThresholds": [1800, 2700, 3600], // strictly increasing; a win always earns ≥ 1 star
  "tutorial": {
    // optional
    "tips": ["Plain-text tip (≤ 140 chars)."], // shown pre-game and in the in-game banner
    "hintDelaySeconds": 8, // idle time before a suggested move is highlighted
  },
  "theme": { "name": "Penalty Box", "backdrop": "night", "accentColor": "#FF6B6B" },
  "seed": 1001, // optional fixed board (tutorials)
}
```

### Layout legend

| Char | Meaning                         |
| ---- | ------------------------------- |
| `.`  | Normal cell (random token)      |
| `T`  | Rally Tile under a random token |
| `#`  | Penalty Block (1 hit)           |
| `%`  | Double Penalty Block (2 hits)   |
| `L`  | Locked Token                    |
| `K`  | Locked Token on a Rally Tile    |

### Objective types

| `type`               | Extra fields | Counts                                                     |
| -------------------- | ------------ | ---------------------------------------------------------- |
| `makeMatches`        | —            | Matches made directly by a swap (cascades excluded)        |
| `clearRallyTiles`    | —            | Tiles cleared (must be ≤ tiles in layout)                  |
| `reachScore`         | —            | Score reached (keep ≤ 1-star threshold)                    |
| `clearPenaltyBlocks` | —            | Blocks fully destroyed (≤ blocks in layout)                |
| `collectTokens`      | `color`      | Tokens of that type cleared (type must be in `tokenTypes`) |
| `unlockTokens`       | —            | Locked Tokens unlocked (≤ locked tokens in layout)         |

Token types: `red` Rally Red (circle), `blue` Spirit Blue (diamond), `gold` Gold Star (star), `green` Victory Green (triangle), `purple` Spark Purple (hexagon), `orange` Momentum Orange (square).

## Current difficulty curve (bot win rate, `npm run simulate:levels`)

| Level             | Goal                     | Moves | Introduces                         | Bot win % (approx.) |
| ----------------- | ------------------------ | ----- | ---------------------------------- | ------------------- |
| 1 Opening Whistle | Make 5 matches           | 12    | Swapping (tutorial, 4 token types) | 100                 |
| 2 Tile Time       | Clear 20 Rally Tiles     | 18    | Rally Tiles (tutorial)             | ~100                |
| 3 Score Surge     | Earn 1,500 points        | 18    | Cascades & score (tutorial)        | 100                 |
| 4 Penalty Box     | Clear 8 Penalty Blocks   | 20    | Penalty Blocks, gravity stops      | 100                 |
| 5 Line Rally      | Clear 14 Rally Tiles     | 20    | Line Rally combo + tray booster    | ~75                 |
| 6 Green Wave      | Collect 18 Victory Green | 16    | Collect objective                  | ~98                 |
| 7 Locked In       | Unlock 8 Locked Tokens   | 18    | Locked Tokens                      | ~90                 |
| 8 Mixed Signals   | 8 blocks + 4,000 pts     | 20    | Double blocks, Color Rally         | ~85                 |
| 9 Campus Burst    | Clear 30 Rally Tiles     | 18    | Campus Burst                       | ~100                |
| 10 Rivalry Rush   | 8 blocks + 16 Gold Star  | 25    | Milestone: all boosters, 6 types   | ~88                 |

The bot is greedy and ignores long-term strategy; treat these as floors, and validate with playtests.

## Campuses

Edit `src/content/campuses.ts` only. Each campus needs an `id`, `name`, `rallyCry`, `description`, `emblem` (`fox | comet | owl | spark | pilot`), and colors (`primary`, `secondary`, `onPrimary` with readable contrast). Keep identities fictional — no real school names, mascots, or color pairings that unmistakably identify a real school.

## Copy guidelines

- Short, upbeat, family-safe. Use the game's own terms: Rally Tiles, Penalty Blocks, Fan Badges, Line Rally, Campus Burst, Color Rally, Championship Trail, Rivalry Rush.
- Never use NCAA, conference, bowl, playoff, or real team/athlete names, or other games' branded terms.
- Every instruction must be readable as text, not only shown visually.
