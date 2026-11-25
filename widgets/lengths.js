// How long matches last: best-of-5 tennis against "lead by k", with k the smallest lead that is at least as accurate.
// Exact distributions; bins of 10 points; a crosshair tooltip; numbers in a readout below.
import { F, dist, leadBy } from '../src/scoring.js';
const NS = 'http://www.w3.org/2000/svg';
const BIN = 10, XMAX = 700;

export function leadByDist(k, p, maxLen = 6000) { // exact length distribution of "first to lead by k"
  let st = new Float64Array(2 * k + 1); st[k] = 1; const out = new Float64Array(maxLen + 1);
  for (let n = 1; n <= maxLen; n++) { const nx = new Float64Array(2 * k + 1);
    for (let d = 1; d < 2 * k; d++) { const pr = st[d]; if (!pr) continue; nx[d + 1] += pr * p; nx[d - 1] += pr * (1 - p); }
    out[n] = nx[0] + nx[2 * k]; nx[0] = 0; nx[2 * k] = 0; st = nx; }
  return out;
}
const summary = (len) => { let m = 0, c = 0, p99 = 0, over = 0; for (let L = 0; L < len.length; L++) { m += L * len[L]; c += len[L]; if (!p99 && c >= 0.99) p99 = L; if (L > 400) over += len[L]; } return { mean: m, p99, over }; };

export function mount(el) {
  el.innerHTML = `<div class="controls"><label>The better player wins <span class="num" data-v></span> of points
    <input type="range" min="50" max="58" step="1" value="55" aria-label="Share of points the better player wins"></label></div>
    <div class="chart-wrap"></div>
    <div class="legend"><span><i style="background:#a8650f"></i>Tennis, best of 5</span><span><i style="background:#2f6fb8"></i><span data-kl></span></span></div>
    <p class="readout" aria-live="polite"></p>`;
  const slider = el.querySelector('input'), vOut = el.querySelector('[data-v]'), wrap = el.querySelector('.chart-wrap'), readout = el.querySelector('.readout');
  function draw() {
    const p = +slider.value / 100; vOut.textContent = `${slider.value}%`;
    const t = dist(F.tennisBo5, p), tl = new Float64Array(Math.max(t.A.length, t.B.length)); for (let i = 0; i < tl.length; i++) tl[i] = (t.A[i] || 0) + (t.B[i] || 0);
    let tw = 0; for (const x of t.A) tw += x;
    let k = 1; if (p === 0.5) k = 16; else while (leadBy(k, p).win < tw) k++; // equal players: keep the lead of the 55% case
    const lk = leadBy(k, p), ll = leadByDist(k, p);
    el.querySelector('[data-kl]').textContent = `First to lead by ${k} points`;
    const bins = (len) => { const b = new Float64Array(XMAX / BIN); for (let L = 0; L < len.length; L++) { const i = Math.floor(L / BIN); if (i < b.length) b[i] += len[L]; } return b; };
    const bt = bins(tl), bl = bins(ll), ymax = Math.max(...bt, ...bl) * 1.1;
    const narrow = wrap.clientWidth < 520, W = narrow ? 340 : 640, H = narrow ? 260 : 280, L = 48, R = 14, T = 22, B = 44;
    const x = (v) => L + v / XMAX * (W - L - R), y = (v) => T + (1 - v / ymax) * (H - T - B);
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.classList.add('chart', 'frontier');
    svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', `Chart of how many points a match lasts: best-of-5 tennis is concentrated between about 120 and 350 points; first to lead by ${k} is often shorter but has a long tail. Numbers in the text below.`);
    const add = (tag, a, text) => { const e = document.createElementNS(NS, tag); for (const k in a) e.setAttribute(k, a[k]); if (text != null) e.textContent = text; svg.append(e); return e; };
    for (let i = 0; i <= 4; i++) { const v = ymax / 1.1 * i / 4; add('line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }); add('text', { x: L - 6, y: y(v) + 4, class: 'tick', 'text-anchor': 'end' }, `${(100 * v).toFixed(1)}%`); }
    for (let v = 0; v <= XMAX; v += narrow ? 200 : 100) add('text', { x: x(v), y: H - B + 17, class: 'tick', 'text-anchor': 'middle' }, v);
    add('text', { x: (L + W - R) / 2, y: H - 6, class: 'axis', 'text-anchor': 'middle' }, 'points in the match');
    add('text', { x: 4, y: 13, class: 'axis' }, 'share of matches, per 10 points');
    const path = (b) => Array.from(b).map((v, i) => `${i ? 'L' : 'M'}${x(i * BIN + BIN / 2).toFixed(1)},${y(v).toFixed(1)}`).join('');
    add('path', { d: path(bt), fill: 'none', stroke: '#a8650f', 'stroke-width': 2 });
    add('path', { d: path(bl), fill: 'none', stroke: '#2f6fb8', 'stroke-width': 2 });
    const peak = (b) => b.reduce((bi, v, i) => (v > b[bi] ? i : bi), 0), it = peak(bt), il = peak(bl);
    add('text', { x: x(it * BIN + BIN / 2) + 10, y: y(bt[it]) + 4, class: 'label' }, 'tennis');
    add('text', { x: x(il * BIN + BIN / 2) - 8, y: y(bl[il]) - 8, class: 'label', 'text-anchor': il * BIN < 60 ? 'start' : 'middle' }, `lead by ${k}`);
    const cross = add('line', { x1: 0, x2: 0, y1: T, y2: H - B, stroke: '#8b93a1', 'stroke-width': 1, visibility: 'hidden' });
    const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
    const zone = add('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent' });
    zone.addEventListener('pointermove', (e) => { const bb = svg.getBoundingClientRect(), s = bb.width / W, vx = (e.clientX - bb.left) / s;
      const i = Math.max(0, Math.min(bt.length - 1, Math.floor((vx - L) / (W - L - R) * XMAX / BIN)));
      const cx = x(i * BIN + BIN / 2); cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      tip.hidden = false; tip.innerHTML = `<b>${i * BIN + 1} to ${i * BIN + BIN} points</b><br>Tennis bo5: ${(100 * bt[i]).toFixed(2)}%<br>Lead by ${k}: ${(100 * bl[i]).toFixed(2)}%`;
      const left = cx * s + 14; tip.style.left = `${left + 230 > bb.width ? cx * s - 244 : left}px`; tip.style.top = `${T * s}px`; });
    zone.addEventListener('pointerleave', () => { tip.hidden = true; cross.setAttribute('visibility', 'hidden'); });
    wrap.replaceChildren(svg, tip);
    const st = summary(tl), sl = summary(ll);
    readout.innerHTML = p === 0.5 ? `Two equal players, so there is no better player to find. Lead by ${k} lasts <span class="num">${sl.mean.toFixed(0)}</span> points on
      average (tennis: <span class="num">${st.mean.toFixed(0)}</span>), but 1 match in 100 runs past <span class="num">${sl.p99}</span> points
      (tennis: ${st.p99}), and <span class="num">${(100 * sl.over).toFixed(1)}%</span> go past 400 (tennis: ${(100 * st.over).toFixed(1)}%).` : `Both find the better player about as often (tennis ${(100 * tw).toFixed(1)}%, lead by ${k}: ${(100 * lk.win).toFixed(1)}%).
      On average lead by ${k} needs <span class="num">${sl.mean.toFixed(0)}</span> points, tennis <span class="num">${st.mean.toFixed(0)}</span>.
      But 1 match in 100 runs past <span class="num">${sl.p99}</span> points under lead by ${k}, against <span class="num">${st.p99}</span> in tennis,
      and <span class="num">${(100 * sl.over).toFixed(1)}%</span> of them go past 400 points (tennis: ${(100 * st.over).toFixed(1)}%).`;
  }
  let to = 0; slider.addEventListener('input', () => { vOut.textContent = `${slider.value}%`; clearTimeout(to); to = setTimeout(draw, 60); });
  let lastNarrow = null; new ResizeObserver(() => { const n = wrap.clientWidth < 520; if (n !== lastNarrow) { lastNarrow = n; draw(); } }).observe(wrap);
}
