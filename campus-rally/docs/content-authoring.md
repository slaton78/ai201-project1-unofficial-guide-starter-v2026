# Content authoring

Content is data, kept in `src/content/`. Screens never hard-code campus or trail details.

## Campuses

Edit `src/content/campuses.ts` only. Each campus needs an `id`, `name`, `rallyCry`, `description`, `emblem` (`fox | comet | owl | spark | pilot`), and colors (`primary`, `secondary`, `onPrimary` with readable contrast). Keep identities fictional — no real school names, mascots, or color pairings that unmistakably identify a real school.

## Championship Trail stops (Phase A)

`src/content/trail.ts` lists the stops shown on the trail: `id` (`level-NNN`, the same id the save
uses in `levelProgressById`), `levelNumber`, and `title`. To add a stop, append a title to `TITLES`;
ids and numbers are derived. `tests/content.test.ts` checks the list.

## Levels (planned for Phase C — not implemented yet)

Playable levels will be JSON files in `src/content/levels/level-NNN.json`, one per trail stop,
validated by a schema and by content tests that check every objective is achievable. The game
should scale to 60+ levels with no code changes. Target curve for the first ten:

| Level             | Goal                     | Moves | Introduces                     |
| ----------------- | ------------------------ | ----- | ------------------------------ |
| 1 Opening Whistle | Make 5 matches           | 12    | Swapping (tutorial)            |
| 2 Tile Time       | Clear 20 Rally Tiles     | 18    | Rally Tiles (tutorial)         |
| 3 Score Surge     | Earn 1,500 points        | 18    | Cascades & score (tutorial)    |
| 4 Penalty Box     | Clear 8 Penalty Blocks   | 20    | Penalty Blocks                 |
| 5 Line Rally      | Clear Rally Tiles        | 20    | Line Rally combo               |
| 6 Green Wave      | Collect 18 Victory Green | ~18   | Collect objective              |
| 7 Locked In       | Unlock Locked Tokens     | ~20   | Locked Tokens                  |
| 8 Mixed Signals   | Blocks + score           | ~20   | Mixed objective, Double blocks |
| 9 Campus Burst    | Clear Rally Tiles        | ~20   | Campus Burst                   |
| 10 Rivalry Rush   | Two objectives           | ~25   | Milestone level                |

### Level JSON reference (planned)

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

## Copy guidelines

- Short, upbeat, family-safe. Use the game's own terms: Rally Tiles, Penalty Blocks, Fan Badges, Line Rally, Campus Burst, Color Rally, Championship Trail, Rivalry Rush.
- Never use NCAA, conference, bowl, playoff, or real team/athlete names, or other games' branded terms.
- Every instruction must be readable as text, not only shown visually.
