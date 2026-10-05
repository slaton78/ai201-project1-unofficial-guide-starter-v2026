/**
 * Balancing tool: plays every level many times with a simple objective-aware greedy bot and
 * prints win rate and score percentiles. The bot is weaker than an attentive player, so it is
 * a floor, not a target. Usage: npm run simulate:levels [-- runsPerLevel]
 */
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = `
import { LEVELS } from '@/content/levels';
import { GameSession } from '@/game/core/GameSession';
import { findLegalMoves } from '@/game/core/MoveValidator';
import { findMatches } from '@/game/core/MatchFinder';
import { swapTokens, getCell, orthogonalNeighbors } from '@/game/core/Board';

function moveValue(session, move) {
  const board = swapTokens(session.board, move.from, move.to);
  let value = 0;
  const objectives = session.level.objectives;
  for (const group of findMatches(board)) {
    value += group.cells.length;
    if (group.shape !== 'line3') value += 6;
    for (const cell of group.cells) {
      const c = getCell(board, cell);
      for (const o of objectives) {
        if (o.type === 'clearRallyTiles' && c.rallyTile) value += 3;
        if (o.type === 'unlockTokens' && c.token && c.token.locked) value += 4;
        if (o.type === 'collectTokens' && c.token && c.token.color === o.color) value += 2;
        if (o.type === 'clearPenaltyBlocks')
          for (const n of orthogonalNeighbors(board, cell)) if (getCell(board, n).obstacle) value += 4;
      }
    }
  }
  return value;
}

export function simulate(runs) {
  const report = [];
  for (const level of LEVELS) {
    let wins = 0;
    const scores = [];
    let stars = [0, 0, 0, 0];
    for (let r = 0; r < runs; r += 1) {
      const session = new GameSession(level, 5000 + r * 31);
      while (session.snapshot().status === 'playing') {
        const snap = session.snapshot();
        for (const type of ['lineRally', 'campusBurst', 'colorRally']) {
          if (snap.boosters[type] > 0 && snap.movesRemaining <= 3) {
            const target = type === 'colorRally' ? { row: 3, col: 3 } : { row: 4, col: 4 };
            session.useBooster(type, target);
          }
        }
        if (session.snapshot().status !== 'playing') break;
        const moves = findLegalMoves(session.board);
        let best = moves[0];
        let bestValue = -1;
        for (const m of moves) {
          const v = moveValue(session, m) + Math.random() * 0.5;
          if (v > bestValue) { bestValue = v; best = m; }
        }
        session.trySwap(best.from, best.to);
      }
      const snap = session.snapshot();
      if (snap.status === 'won') wins += 1;
      stars[snap.stars] += 1;
      scores.push(snap.score);
    }
    scores.sort((a, b) => a - b);
    const pct = (p) => scores[Math.min(scores.length - 1, Math.floor(p * scores.length))];
    report.push({ level: level.id, winRate: (wins / runs * 100).toFixed(0) + '%', p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p90: pct(0.9), stars: stars.join('/'), thresholds: level.starThresholds.join('/') });
  }
  return report;
}
`;

const runs = Number(process.argv[2] ?? 60);
const outDir = mkdtempSync(path.join(tmpdir(), 'campus-rally-sim-'));
const outfile = path.join(outDir, 'sim.mjs');
const result = await build({
  stdin: { contents: entry, resolveDir: root, loader: 'js' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  tsconfig: path.join(root, 'tsconfig.json'),
  logLevel: 'error',
});
writeFileSync(outfile, result.outputFiles[0].text);
const { simulate } = await import(pathToFileURL(outfile).href);
console.table(simulate(runs));
