// Every number the essay cites, computed here. Run: node proto/numbers.mjs > NUMBERS.txt
import { F, quick, stats, frontierMean, leadBy, dist } from '../src/scoring.js';
import { play } from '../src/play.js';
import * as T from './tennis.mjs';
const e = (f, p) => { const q = quick(f, p); return `${(100 * q.win).toFixed(1)}% after ${q.mean.toFixed(1)} pts, best ${frontierMean(q.win, p).toFixed(1)}, eff ${(100 * frontierMean(q.win, p) / q.mean).toFixed(1)}%`; };
for (const p of [0.52, 0.55]) { console.log(`\n== p = ${p}`); for (const [k, f] of Object.entries(F)) console.log(k.padEnd(16), e(f, p)); }
const p = 0.55, t5 = quick(F.tennisBo5, p); let k = 1; while (leadBy(k, p).win < t5.win) k++;
console.log(`\nlead by ${k} at .55:`, (100 * leadBy(k, p).win).toFixed(1), leadBy(k, p).mean.toFixed(1), '| at p=.5 mean', k * k);
for (const pp of [0.5, 0.55]) { const s5 = stats(F.tennisBo5, pp); console.log(`tennis bo5 p=${pp}: mean ${s5.mean.toFixed(1)} sd ${s5.sd.toFixed(1)} median ${s5.median} p99 ${s5.p99}`);
  const ll = (await import('../widgets/lengths.js').catch(() => null)); }
// lead-by-k length quantiles (Markov chain, no DOM)
function lbd(k, p, maxLen = 8000) { let st = new Float64Array(2 * k + 1); st[k] = 1; const out = new Float64Array(maxLen + 1);
  for (let n = 1; n <= maxLen; n++) { const nx = new Float64Array(2 * k + 1); for (let d = 1; d < 2 * k; d++) { const pr = st[d]; if (!pr) continue; nx[d + 1] += pr * p; nx[d - 1] += pr * (1 - p); }
    out[n] = nx[0] + nx[2 * k]; st = nx; st[0] = 0; st[2 * k] = 0; } return out; }
for (const pp of [0.5, 0.55]) { const l = lbd(k, pp); let c = 0, p99 = 0, med = 0, over = 0, m = 0; for (let L = 0; L < l.length; L++) { c += l[L]; m += L * l[L]; if (!med && c >= 0.5) med = L; if (!p99 && c >= 0.99) p99 = L; if (L > 400) over += l[L]; }
  const s5 = stats(F.tennisBo5, pp), d5 = dist(F.tennisBo5, pp); let o5 = 0; for (let L = 401; L < Math.max(d5.A.length, d5.B.length); L++) o5 += (d5.A[L] || 0) + (d5.B[L] || 0);
  console.log(`p=${pp} lead by ${k}: mean ${m.toFixed(1)} median ${med} p99 ${p99} over400 ${(100 * over).toFixed(2)}% | tennis bo5 p99 ${s5.p99} over400 ${(100 * o5).toFixed(2)}% max-ish ${s5.max}`); }
// winner won fewer points, simulated (2e6 matches)
let seed = 12345; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
for (const [key, pp] of [['tennisBo5', 0.5], ['tennisBo3', 0.5], ['tennisBo3', 0.52], ['vbBo5', 0.5], ['ttBo7', 0.5], ['badmintonBo3', 0.5], ['badminton15Bo3', 0.5]]) {
  let fewer = 0; const N = 1e6; for (let i = 0; i < N; i++) { const r = play(F[key], pp, Math.random); if (r.aWon ? r.ptsA < r.ptsB : r.ptsB < r.ptsA) fewer++; }
  console.log(`fewer-points winner ${key} p=${pp}: ${(100 * fewer / N).toFixed(2)}% (1e6 sims, se ~0.03)`); }
console.log('\nserve model, Pena et al. Table 10 (pa .6, pb .5, bo5, final 10-pt TB, A serves first every set as they assume):');
console.log('real alternation:', T.match(0.6, 0.5, 5, 7, 10));
