// Exact analysis of sports scoring formats as tests of "who is the better player".
// Points are independent; player A wins each point with probability p.
//
// A format is either 'point' or a race:
//   { to, by = 1, cap = Infinity, unit, tb = null, decider = null }
//   - first to `to` units, needing a lead of `by` (1 or 2); `cap` ends it at that many units regardless of lead
//   - tb: { at, unit }: at at-at, one deciding unit (a tiebreak) is played instead of continuing (tennis set at 6-6)
//   - decider: unit used when both players are one unit away from winning (volleyball's fifth set to 15)
// dist(format, p) returns { A, B } where A[L] = P(A wins and the format lasted exactly L points), same for B.
// Lengths beyond MAXLEN are dropped; `lost` reports their total probability (tiny for real formats).

export const MAXLEN = 6000;

function conv(x, y, out, scale) { // out += scale * (x * y), truncated at MAXLEN
  let xl = x.length, yl = y.length;
  for (let i = 0; i < xl; i++) { const xi = x[i] * scale; if (xi === 0) continue;
    const lim = Math.min(yl, MAXLEN - i); for (let j = 0; j < lim; j++) out[i + j] += xi * y[j]; }
}
const trim = (a) => { let n = a.length; while (n > 1 && a[n - 1] < 1e-300) n--; return a.subarray(0, n); };

const cache = new WeakMap();
export function dist(f, p) {
  if (f === 'point') { const A = new Float64Array(2), B = new Float64Array(2); A[1] = p; B[1] = 1 - p; return { A, B, lost: 0 }; }
  let byP = cache.get(f); if (!byP) cache.set(f, byP = new Map());
  if (byP.has(p)) return byP.get(p);
  const r = race(f, p); byP.set(p, r); return r;
}

function race(f, p) {
  const { to, by = 1, cap = Infinity, unit, tb = null, decider = null } = f;
  const u = dist(unit, p), t = tb ? dist(tb.unit, p) : null, d = decider ? dist(decider, p) : null;
  const A = new Float64Array(MAXLEN), B = new Float64Array(MAXLEN);
  let lost = 0;
  // State (a, b) -> length distribution so far. With by = 2 and no cap, scores past (to-1, to-1) repeat by
  // difference, so they are folded back to keep the state space finite.
  const norm = (a, b) => { if (by === 2 && cap === Infinity && !tb && a >= to - 1 && b >= to - 1) { const k = Math.min(a, b) - (to - 1); a -= k; b -= k; } return a + ',' + b; };
  const won = (a, b) => (a >= to && a - b >= by) || a >= cap || (tb && a === tb.at + 1 && b === tb.at);
  let layer = new Map([['0,0', Object.assign(new Float64Array(1), { 0: 1 })]]);
  for (let round = 0; layer.size && round < 100000; round++) {
    const next = new Map(); let alive = 0;
    for (const [key, len] of layer) {
      const [a, b] = key.split(',').map(Number);
      const cur = tb && a === tb.at && b === tb.at ? t : (d && a === to - 1 && b === to - 1 && by === 1 ? d : u);
      for (const [w, ud] of [[1, cur.A], [0, cur.B]]) {
        const na = a + w, nb = b + 1 - w;
        if (won(na, nb)) { conv(len, ud, A, 1); continue; }
        if (won(nb, na)) { conv(len, ud, B, 1); continue; }
        const k = norm(na, nb); let tgt = next.get(k);
        if (!tgt) next.set(k, tgt = new Float64Array(MAXLEN));
        conv(len, ud, tgt, 1);
      }
    }
    layer = new Map();
    for (const [k, v] of next) { const tv = trim(v); let m = 0; for (const x of tv) m += x; alive += m; if (m > 1e-16) layer.set(k, tv); else lost += m; }
    if (alive < 1e-16) { lost += alive; break; }
  }
  // mass that ran past MAXLEN
  let mA = 0, mB = 0; for (const x of A) mA += x; for (const x of B) mB += x;
  lost = Math.max(lost, 1 - mA - mB);
  return { A: trim(A), B: trim(B), lost };
}

// Summary: P(A wins), mean and standard deviation of the number of points, and length quantiles.
export function stats(f, p) {
  const { A, B, lost } = dist(f, p);
  let w = 0, m = 0, m2 = 0; const n = Math.max(A.length, B.length), all = new Float64Array(n);
  for (let L = 0; L < n; L++) { const x = (A[L] || 0) + (B[L] || 0); all[L] = x; w += A[L] || 0; m += x * L; m2 += x * L * L; }
  const mean = m / (1 - lost), sd = Math.sqrt(Math.max(0, m2 / (1 - lost) - mean * mean));
  const q = (t) => { let c = 0; for (let L = 0; L < n; L++) { c += all[L] / (1 - lost); if (c >= t) return L; } return n; };
  return { win: w / (1 - lost), mean, sd, median: q(0.5), p99: q(0.99), max: n - 1, lost };
}

// The best possible test (Wald's sequential probability ratio test; optimal by Wald-Wolfowitz): keep playing points
// until one player leads by k. With r = (1-p)/p: accuracy 1/(1+r^k), mean length k(2acc-1)/(2p-1) (gambler's ruin).
export function leadBy(k, p) {
  if (p === 0.5) return { win: 0.5, mean: k * k };
  const r = (1 - p) / p, acc = 1 / (1 + Math.pow(r, k));
  return { win: acc, mean: (k * (2 * acc - 1)) / (2 * p - 1) };
}
// Wald's inequality: any test whose chance of picking the wrong player is at most 1-acc (whoever is better) needs on
// average at least (2acc-1) ln(acc/(1-acc)) / ((2p-1) ln(p/(1-p))) points. A fair format treats both players alike, so
// this bounds every fair format; "lead by k" meets it exactly when k is a whole number.
export function frontierMean(acc, p) {
  if (acc <= 0.5) return 0;
  return ((2 * acc - 1) * Math.log(acc / (1 - acc))) / ((2 * p - 1) * Math.log(p / (1 - p)));
}
export const efficiency = (f, p) => { const s = stats(f, p); return frontierMean(s.win, p) / s.mean; };

// Formats. Unit names follow each sport's rules (simplified to independent points; see the essay for serve).
const R = (to, unit, o = {}) => ({ to, unit, ...o });
export const F = {};
F.tennisGame = R(4, 'point', { by: 2 });
F.tiebreak7 = R(7, 'point', { by: 2 });
F.tiebreak10 = R(10, 'point', { by: 2 });
F.tennisSet = R(6, F.tennisGame, { by: 2, tb: { at: 6, unit: F.tiebreak7 } });
F.advantageSet = R(6, F.tennisGame, { by: 2 });
F.tennisBo3 = R(2, F.tennisSet); // tour events: a normal set decides
F.tennisBo5 = R(3, // Grand Slams since 2022: 10-point tiebreak at 6-6 in the fifth set
  F.tennisSet, { decider: R(6, F.tennisGame, { by: 2, tb: { at: 6, unit: F.tiebreak10 } }) });
F.noAdGame = R(4, 'point');
F.noAdSet = R(6, F.noAdGame, { by: 2, tb: { at: 6, unit: F.tiebreak7 } });
F.noAdBo3 = R(2, F.noAdSet, { decider: F.tiebreak10 }); // college/doubles style: match tiebreak instead of a third set
F.ttGame = R(11, 'point', { by: 2 });
F.ttBo5 = R(3, F.ttGame);
F.ttBo7 = R(4, F.ttGame);
F.badmintonGame = R(21, 'point', { by: 2, cap: 30 });
F.badmintonBo3 = R(2, F.badmintonGame);
F.vbSet = R(25, 'point', { by: 2 });
F.vbBo5 = R(3, F.vbSet, { decider: R(15, 'point', { by: 2 }) });
F.squashBo5 = R(3, R(11, 'point', { by: 2 }));
F.race21 = R(21, 'point');
