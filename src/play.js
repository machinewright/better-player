// Plays one match of a format point by point (same rule objects as scoring.js) and keeps the score line.
// Returns { aWon, ptsA, ptsB, line }: line lists, for each top-level unit, how many sub-units each player won,
// with a tiebreak's points in brackets (tennis style).
export function play(f, p, rnd = Math.random) {
  const tot = [0, 0];
  function rec(f, depth) {
    if (f === 'point') { const w = rnd() < p; tot[w ? 0 : 1]++; return { w, a: 0, b: 0, kids: [] }; }
    const { to, by = 1, cap = Infinity, unit, tb, decider } = f; let a = 0, b = 0, tbr = null; const kids = [];
    for (;;) {
      if ((a >= to && a - b >= by) || a >= cap) return { w: true, a, b, kids, tbr };
      if ((b >= to && b - a >= by) || b >= cap) return { w: false, a, b, kids, tbr };
      if (tb && a === tb.at && b === tb.at) { const r = rec(tb.unit, depth + 1); r.w ? a++ : b++; tbr = r; continue; }
      const u = decider && by === 1 && a === to - 1 && b === to - 1 ? decider : unit;
      const r = rec(u, depth + 1); kids.push(r); r.w ? a++ : b++;
    }
  }
  const top = rec(f, 0);
  const line = top.kids.length && top.kids[0].kids ? top.kids.map((k) => {
    let s = `${k.a}-${k.b}`; if (k.tbr) s += `(${Math.min(k.tbr.a, k.tbr.b)})`; return s; }) : [`${top.a}-${top.b}`];
  return { aWon: top.w, ptsA: tot[0], ptsB: tot[1], line };
}
