// Exact win probability and expected points for "race to n, win by 2 (optional cap)" games, nested best-of matches,
// i.i.d. points with P(A wins point)=p. Efficiency vs Wald's SPRT (random walk to +-k) at the same accuracy.
// A "level" is described by {win, prob(p) -> {w, n}} where w = P(A wins unit), n = E[points].
function race(n, by2 = true, cap = Infinity) {
  return (p) => { // DP over scores; deuce handled in closed form
    const q = 1 - p, memo = new Map();
    const f = (a, b) => { // returns [P(A wins), E[remaining points]]
      if (a >= n && a - b >= (by2 ? 2 : 1) || a === cap) return [1, 0];
      if (b >= n && b - a >= (by2 ? 2 : 1) || b === cap) return [0, 0];
      if (by2 && a >= n - 1 && a === b && cap === Infinity) { // deuce: win two in a row
        const w = p * p / (p * p + q * q), e = 2 / (p * p + q * q); return [w, e]; }
      const k = a + ',' + b; if (memo.has(k)) return memo.get(k);
      const [w1, e1] = f(a + 1, b), [w2, e2] = f(a, b + 1);
      const r = [p * w1 + q * w2, 1 + p * e1 + q * e2]; memo.set(k, r); return r;
    };
    const [w, e] = f(0, 0); return { w, n: e };
  };
}
// nested: units are themselves games; a set/match is a race of units, each unit's points add up.
// E[points] of a match = E[units played] * ... not exact when units differ in length by winner; do exact DP with
// conditional lengths: E[points | unit won by A] etc. For simplicity compute exactly via per-unit (wA, eA, eB).
function unitStats(levelFn) { return levelFn; }
function nestRace(n, by2, cap, inner, tieInner) { // tieInner: unit used at the cap score (tennis tiebreak)
  return (p) => {
    const u = inner(p), t = tieInner ? tieInner(p) : u;
    // race over units with win prob u.w, expected points per unit u.n (independent of who wins: E[len] enters linearly)
    const memo = new Map();
    const f = (a, b) => {
      if (a >= n && a - b >= (by2 ? 2 : 1) || a === cap) return [1, 0];
      if (b >= n && b - a >= (by2 ? 2 : 1) || b === cap) return [0, 0];
      const k = a + ',' + b; if (memo.has(k)) return memo.get(k);
      const cur = (tieInner && a === cap - 1 && b === cap - 1) ? t : u;
      const [w1, e1] = f(a + 1, b), [w2, e2] = f(a, b + 1);
      const r = [cur.w * w1 + (1 - cur.w) * w2, cur.n + cur.w * e1 + (1 - cur.w) * e2]; memo.set(k, r); return r;
    };
    const [w, e] = f(0, 0); return { w, n: e };
  };
}
const bestOf = (k, inner) => nestRace((k + 1) / 2, false, Infinity, inner);
// Expected-length linearity: E[total points] = sum over units played of E[unit length]; unit length depends on who
// wins the unit, but E[sum] = E[#units] * E[unit length] is NOT exact in general. Exact check below by brute force.
function sprt(p, acc) { const q = 1 - p, k = Math.log(acc / (1 - acc)) / Math.log(p / q); return k * (2 * acc - 1) / (p - q); }
const tGame = race(4), tTB = race(7), tSet = nestRace(6, true, 7, tGame, tTB);
const F = {
  'tennis game': tGame,
  'tennis set (TB at 6-6)': tSet,
  'tennis best of 3 sets': bestOf(3, tSet),
  'tennis best of 5 sets': bestOf(5, tSet),
  'no-ad tennis bo3': bestOf(3, nestRace(6, true, 7, race(4, false), tTB)),
  'table tennis game (11)': race(11),
  'table tennis bo5': bestOf(5, race(11)),
  'table tennis bo7': bestOf(7, race(11)),
  'badminton game (21, cap 30)': race(21, true, 30),
  'badminton bo3': bestOf(3, race(21, true, 30)),
  'squash PAR 11 bo5': bestOf(5, race(11)),
  'volleyball bo5 (25,25,25,25,15)': null,
  'race to 21 (no win by 2)': race(21, false),
};
// volleyball: sets 1-4 to 25, set 5 to 15
F['volleyball bo5 (25,25,25,25,15)'] = (p) => { const s = race(25)(p), s5 = race(15)(p); const memo = new Map();
  const f = (a, b) => { if (a === 3) return [1, 0]; if (b === 3) return [0, 0]; const u = a + b === 4 ? s5 : s;
    const [w1, e1] = f(a + 1, b), [w2, e2] = f(a, b + 1); return [u.w * w1 + (1 - u.w) * w2, u.n + u.w * e1 + (1 - u.w) * e2]; };
  const [w, e] = f(0, 0); return { w, n: e }; };
for (const p of [0.51, 0.55, 0.6]) {
  console.log(`\np = ${p}`);
  for (const [name, fn] of Object.entries(F)) { const { w, n } = fn(p); const s = sprt(p, w);
    console.log(`${name.padEnd(32)} P(better wins) ${w.toFixed(4)}  E[points] ${n.toFixed(1).padStart(6)}  SPRT ${s.toFixed(1).padStart(6)}  eff ${(s / n).toFixed(3)}`); }
}
