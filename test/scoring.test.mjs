import { test } from 'node:test';
import assert from 'node:assert/strict';
import { F, stats, leadBy, frontierMean, dist } from '../src/scoring.js';

// Independent simulator: plays a format point by point straight from the rule object (no shared code with the DP).
function play(f, p, rnd) {
  if (f === 'point') return [rnd() < p, 1];
  let a = 0, b = 0, pts = 0;
  for (;;) {
    const { to, by = 1, cap = Infinity, unit, tb, decider } = f;
    if ((a >= to && a - b >= by) || a >= cap) return [true, pts];
    if ((b >= to && b - a >= by) || b >= cap) return [false, pts];
    if (tb && a === tb.at && b === tb.at) { const [w, n] = play(tb.unit, p, rnd); return [w, pts + n]; }
    const u = decider && by === 1 && a === to - 1 && b === to - 1 ? decider : unit;
    const [w, n] = play(u, p, rnd); pts += n; w ? a++ : b++;
  }
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

test('exact DP agrees with simulation on every format', () => {
  const r = rng(7), N = 60000;
  for (const [name, f] of Object.entries(F)) for (const p of [0.5, 0.57]) {
    let w = 0, s = 0, s2 = 0; for (let i = 0; i < N; i++) { const [x, n] = play(f, p, r); w += x; s += n; s2 += n * n; }
    const e = stats(f, p), sd = Math.sqrt(s2 / N - (s / N) ** 2);
    assert.ok(Math.abs(w / N - e.win) < 4.5 * Math.sqrt(e.win * (1 - e.win) / N) + 1e-9, `${name} p=${p} win ${w / N} vs ${e.win}`);
    assert.ok(Math.abs(s / N - e.mean) < 4.5 * e.sd / Math.sqrt(N) + 1e-9, `${name} p=${p} mean ${s / N} vs ${e.mean}`);
    assert.ok(Math.abs(sd - e.sd) / e.sd < 0.03, `${name} p=${p} sd ${sd} vs ${e.sd}`);
  }
});

test('published values', () => {
  // Classic closed form for a tennis game: p^4 (15 - 4p - 10p^2/(1 - 2pq))... checked value at p = 0.6: 0.7357
  assert.equal(stats(F.tennisGame, 0.6).win.toFixed(4), '0.7357');
  // Expected points in a game at p = 0.5: 6.75 (Fischer 1980 and others)
  assert.equal(stats(F.tennisGame, 0.5).mean.toFixed(4), '6.7500');
  // Probabilities sum to 1, fair formats are fair
  for (const f of Object.values(F)) { const e = stats(f, 0.5); assert.ok(Math.abs(e.win - 0.5) < 1e-12); assert.ok(e.lost < 1e-12); }
});

test('Wald bound: met by lead-by-k at whole k, never beaten by a real format', () => {
  for (const p of [0.51, 0.55, 0.6, 0.7]) {
    for (let k = 1; k < 30; k++) { const l = leadBy(k, p); if (l.win > 1 - 1e-6) break; assert.ok(Math.abs(frontierMean(l.win, p) - l.mean) < 1e-9 * l.mean); }
    for (const f of Object.values(F)) { const e = stats(f, p); assert.ok(e.mean >= frontierMean(e.win, p) - 1e-9); }
  }
});

test('lead-by-k matches its own exact DP', () => {
  // lead by k == race to k with a lead of 2? No: model it directly as gambler's ruin via the race engine is not
  // possible, so check against a direct Markov computation.
  for (const p of [0.55, 0.62]) for (const k of [1, 3, 6]) {
    let st = new Map([[0, 1]]), win = 0, mean = 0;
    for (let n = 1; n < 5000; n++) { const nx = new Map();
      for (const [d, pr] of st) for (const [dd, q] of [[1, p], [-1, 1 - p]]) { const e = d + dd;
        if (e === k) { win += pr * q; mean += pr * q * n; } else if (e === -k) mean += pr * q * n; else nx.set(e, (nx.get(e) || 0) + pr * q); }
      st = nx; }
    const l = leadBy(k, p); assert.ok(Math.abs(l.win - win) < 1e-12); assert.ok(Math.abs(l.mean - mean) < 1e-9);
  }
});
