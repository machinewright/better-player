// Serve-aware exact tennis model: pa = P(A wins a point on A's serve), pb = P(B wins a point on B's serve).
// Returns P(A wins) and E[points]. finalTB: tiebreak target in the deciding set (7, 10, or 0 = advantage set).
const memo = (f) => { const m = new Map(); return (...a) => { const k = a.join(','); if (!m.has(k)) m.set(k, f(...a)); return m.get(k); }; };
export function game(p) { // server wins point w.p. p; returns [P(server wins), E[points]]
  const q = 1 - p, d = p * p + q * q, wd = p * p / d, ed = 2 / d;
  const f = memo((a, b) => { if (a >= 4 && a - b >= 2) return [1, 0]; if (b >= 4 && b - a >= 2) return [0, 0];
    if (a === 3 && b === 3) return [wd, ed];
    const [w1, e1] = f(a + 1, b), [w2, e2] = f(a, b + 1); return [p * w1 + q * w2, 1 + p * e1 + q * e2]; });
  return f(0, 0);
}
export function tiebreak(pa, pb, target) { // A serves point 1, then B 2, A 2, ...; returns [P(A wins), E[points]]
  const srvA = (k) => ((k + 1) >> 1) % 2 === 0; // k = points played so far: 0->A, 1,2->B, 3,4->A ...
  const f = memo((a, b) => { if (a >= target && a - b >= 2) return [1, 0]; if (b >= target && b - a >= 2) return [0, 0];
    if (a + b > 4 * target) { // deep deuce: after an even number past, pattern repeats every 2 points with one serve each
      const x = pa * (1 - pb), y = (1 - pa) * pb; return [x / (x + y), 2 / (x + y)]; } // A wins both / B wins both
    const pA = srvA(a + b) ? pa : 1 - pb; const [w1, e1] = f(a + 1, b), [w2, e2] = f(a, b + 1);
    return [pA * w1 + (1 - pA) * w2, 1 + pA * e1 + (1 - pA) * e2]; });
  return f(0, 0);
}
export function set(pa, pb, aServesFirst, tb) { // tb: 7, 10, or 0 (advantage set). Returns [P(A wins), E[pts], P(odd #games)]
  const ga = game(pa), gb = game(pb);
  const f = memo((a, b) => { // returns [P(A wins set), E[points], P(total games odd)] given A serves next iff (a+b even) === aServesFirst
    if ((a >= 6 && a - b >= 2) || (a === 7 && b === 6 && tb)) return [1, 0, (a + b) % 2];
    if ((b >= 6 && b - a >= 2) || (b === 7 && a === 6 && tb)) return [0, 0, (a + b) % 2];
    if (a === 6 && b === 6 && tb) { const first = aServesFirst; // 13th game: server is the one serving game 13 = first server
      const [w, e] = first ? tiebreak(pa, pb, tb) : (([w, e]) => [1 - w, e])(tiebreak(pb, pa, tb));
      return [w, e, 1]; } // tiebreak counts as a game: 13 games -> odd
    if (!tb && a >= 5 && b >= 5 && a === b && a > 6) return f(6, 6); // advantage set: state repeats
    const aServes = ((a + b) % 2 === 0) === aServesFirst;
    const [pw, pe] = aServes ? ga : [1 - gb[0], gb[1]];
    const [w1, e1, o1] = f(a + 1, b), [w2, e2, o2] = f(a, b + 1);
    return [pw * w1 + (1 - pw) * w2, pe + pw * e1 + (1 - pw) * e2, pw * o1 + (1 - pw) * o2]; });
  return f(0, 0);
}
// match: best of n sets. Who serves first in the next set: alternates with game parity (odd #games -> the receiver serves next... )
export function match(pa, pb, n, tb = 7, finalTB = 10) {
  const need = (n + 1) / 2;
  const f = memo((a, b, aFirst) => { if (a === need) return [1, 0]; if (b === need) return [0, 0];
    const t = a + b === n - 1 ? finalTB : tb;
    // P(A wins set) and parity are correlated; condition exactly by splitting: compute set outcome distribution
    const s = setDist(pa, pb, aFirst, t);
    let w = 0, e = s.e;
    for (const [aw, odd, pr] of s.dist) { const next = odd ? !aFirst : aFirst; const [ww, ee] = f(a + aw, b + 1 - aw, next); w += pr * ww; e += pr * ee; }
    return [w, e]; });
  return f(0, 0, true);
}
function setDist(pa, pb, aFirst, tb) { // distribution over (A wins set?, odd games?) and E[points]
  const ga = game(pa), gb = game(pb); const dist = new Map(); let E = 0;
  // forward probability propagation over scores
  let layer = new Map([['0,0', 1]]);
  for (let step = 0; step < 40 && layer.size; step++) { const nl = new Map();
    for (const [k, pr] of layer) { const [a, b] = k.split(',').map(Number);
      const done = (a >= 6 && a - b >= 2) || (b >= 6 && b - a >= 2) || (tb && (a === 7 || b === 7) && a + b === 13);
      if (done) { const key = (a > b ? 1 : 0) + ',' + ((a + b) % 2); dist.set(key, (dist.get(key) || 0) + pr); continue; }
      if (a === 6 && b === 6 && tb) { const [w, e] = aFirst ? tiebreak(pa, pb, tb) : (([w, e]) => [1 - w, e])(tiebreak(pb, pa, tb));
        E += pr * e; nl.set('7,6', (nl.get('7,6') || 0) + pr * w); nl.set('6,7', (nl.get('6,7') || 0) + pr * (1 - w)); continue; }
      const aServes = ((a + b) % 2 === 0) === aFirst; const [pw, pe] = aServes ? ga : [1 - gb[0], gb[1]];
      E += pr * pe; nl.set(`${a + 1},${b}`, (nl.get(`${a + 1},${b}`) || 0) + pr * pw); nl.set(`${a},${b + 1}`, (nl.get(`${a},${b + 1}`) || 0) + pr * (1 - pw)); }
    layer = nl; }
  return { e: E, dist: [...dist].map(([k, v]) => [...k.split(',').map(Number), v]) };
}
if ((process.argv[1] || '').endsWith('tennis.mjs')) {
  console.log('game(0.6)', game(0.6));
  for (const ftb of [7, 10]) console.log('match bo5 pa=.6 pb=.5 finalTB', ftb, match(0.6, 0.5, 5, 7, ftb));
  console.log('equal .6/.6', match(0.6, 0.6, 5, 7, 10));
}
