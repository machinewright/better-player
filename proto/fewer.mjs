import { F } from '../src/scoring.js';
function play(f, p, r, acc) { // returns winner (true = A), and adds points won to acc [a, b]
  if (f === 'point') { const w = r() < p; acc[w ? 0 : 1]++; return w; }
  let a = 0, b = 0; const { to, by = 1, cap = Infinity, unit, tb, decider } = f;
  for (;;) { if ((a >= to && a - b >= by) || a >= cap) return true; if ((b >= to && b - a >= by) || b >= cap) return false;
    if (tb && a === tb.at && b === tb.at) return play(tb.unit, p, r, acc);
    const u = decider && by === 1 && a === to - 1 && b === to - 1 ? decider : unit; play(u, p, r, acc) ? a++ : b++; } }
for (const p of [0.5, 0.52, 0.55]) for (const k of ['tennisBo5', 'tennisBo3', 'vbBo5', 'ttBo5', 'badmintonBo3', 'race21']) {
  let fewer = 0, N = 300000; for (let i = 0; i < N; i++) { const acc = [0, 0]; const w = play(F[k], p, Math.random, acc); if (w ? acc[0] < acc[1] : acc[1] < acc[0]) fewer++; }
  console.log(p, k.padEnd(13), (100 * fewer / N).toFixed(2) + '%'); }
