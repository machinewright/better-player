// The main chart: each real format as a dot (average points played, chance the better player wins), against Wald's
// bound, the best any fair format can do. The y axis is in log-odds (labelled in percent) so that 90%, 99% and 99.9%
// are equally far apart: near certainty is where the formats differ. An edge slider moves everything; a small
// designer adds "your format" as a blue square.
import { F, quick, frontierMean, leadBy } from '../src/scoring.js';
const NS = 'http://www.w3.org/2000/svg';
const R = (to, unit, o = {}) => ({ to, unit, ...o });

export const FORMATS = [
  { key: 'tennisBo5', name: 'Tennis, best of 5 (Grand Slam)', short: 'Tennis bo5', f: F.tennisBo5 },
  { key: 'tennisBo3', name: 'Tennis, best of 3', short: 'Tennis bo3', f: F.tennisBo3 },
  { key: 'noAdBo3', name: 'No-ad tennis, match tiebreak', short: 'No-ad + match TB', f: F.noAdBo3 },
  { key: 'vbBo5', name: 'Volleyball, best of 5', short: 'Volleyball', f: F.vbBo5 },
  { key: 'ttBo7', name: 'Table tennis, best of 7', short: 'Table tennis bo7', f: F.ttBo7 },
  { key: 'ttBo5', name: 'Table tennis or squash, best of 5', short: 'TT / squash bo5', f: F.ttBo5 },
  { key: 'badmintonBo3', name: 'Badminton, games to 21 (until 2026)', short: 'Badminton 21', f: F.badmintonBo3 },
  { key: 'badminton15Bo3', name: 'Badminton, games to 15 (from 2027)', short: 'Badminton 15', f: F.badminton15Bo3 },
  { key: 'tennisSet', name: 'One tennis set', short: 'One set', f: F.tennisSet },
];
const pct = (v, d = 0) => `${(100 * v).toFixed(d)}%`;
const pctTick = (v) => { const s = (100 * v).toFixed(3).replace(/\.?0+$/, ''); return `${s}%`; };
const logit = (w) => Math.log(w / (1 - w));
const TICKS = [0.55, 0.6, 0.7, 0.8, 0.9, 0.95, 0.98, 0.99, 0.995, 0.998, 0.999, 0.9995, 0.9998, 0.9999, 0.99995, 0.99999];
const MAXW = 0.999995;

export function mount(el) {
  el.innerHTML = '';
  const top = document.createElement('div'); top.className = 'controls';
  top.innerHTML = `<label>The better player wins <span class="num" data-v>55%</span> of points
    <input type="range" min="51" max="58" step="1" value="55" aria-label="Share of points the better player wins"></label>`;
  const slider = top.querySelector('input'), vOut = top.querySelector('[data-v]');
  const wrap = document.createElement('div'); wrap.className = 'chart-wrap';
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  const des = document.createElement('div'); des.className = 'designer';
  des.innerHTML = `<p class="dtitle"><svg width="12" height="12" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2" fill="#2f6fb8"/></svg> <b>Your format</b></p>
    <div class="drow"><label>A game is first to <select data-n>${[1,2,3,4,5,6,7,11,15,21,25,50].map((n) => `<option ${n === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select> points</label>
      <label>win by <select data-nb>${[1,2,3,4,5,8,10,12,16,20].map((n) => `<option ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></label></div>
    <div class="drow"><label>A set is first to <select data-m>${[1,2,3,4,5,6,7,8,10].map((n) => `<option ${n === 4 ? 'selected' : ''}>${n}</option>`).join('')}</select> games</label>
      <label>win by <select data-mb>${[1,2,3].map((n) => `<option ${n === 2 ? 'selected' : ''}>${n}</option>`).join('')}</select></label><label><input type="checkbox" data-tb> <span data-tbl></span></label></div>
    <div class="drow"><label>The match is best of <select data-s>${[1, 3, 5, 7].map((n) => `<option ${n === 3 ? 'selected' : ''}>${n}</option>`).join('')}</select> sets</label></div>
    <p class="readout" aria-live="polite"></p>`;
  const readout = des.querySelector('.readout');
  const table = document.createElement('details'); table.innerHTML = '<summary>The numbers as a table</summary><div class="tablewrap"></div>';
  el.append(top, wrap, des, table);

  function mine() {
    const n = +des.querySelector('[data-n]').value, nb = +des.querySelector('[data-nb]').value;
    const m = +des.querySelector('[data-m]').value, mb = m > 1 ? +des.querySelector('[data-mb]').value : 1;
    const tbBox = des.querySelector('[data-tb]'); tbBox.disabled = mb < 2;
    des.querySelector('[data-tbl]').textContent = `a tiebreak (first to 7) at ${m}-all`; const tb = mb >= 2 && tbBox.checked;
    const s = +des.querySelector('[data-s]').value;
    const game = n === 1 && nb === 1 ? 'point' : R(n, 'point', { by: nb });
    const set = m === 1 ? game : R(m, game, { by: mb, ...(tb ? { tb: { at: m, unit: F.tiebreak7 } } : {}) });
    const match = s === 1 ? set : R((s + 1) / 2, set);
    const lead = n === 1 && nb > 1 ? ` (that is: play until someone leads by ${nb})` : '';
    const gameD = n === 1 && nb === 1 ? 'games of a single point' : `games first to ${n} point${n > 1 ? 's' : ''}${nb > 1 ? `, win by ${nb}` : ''}${lead}`;
    const setD = m === 1 ? 'sets of one game' : `sets first to ${m} games${mb > 1 ? `, win by ${mb}${tb ? `, tiebreak at ${m}-all` : ''}` : ''}`;
    const desc = s === 1 && m === 1 ? gameD[0].toUpperCase() + gameD.slice(1).replace(/^Games/, 'One game,') : `${s === 1 ? 'One set' : `Best of ${s} sets`}; ${setD}; ${gameD}`;
    return { f: match === 'point' ? R(1, 'point') : match, desc };
  }

  function draw() {
    const p = +slider.value / 100; vOut.textContent = pct(p);
    const narrow = wrap.clientWidth < 520;
    const W = narrow ? 340 : 640, H = narrow ? 440 : 430, L = narrow ? 46 : 58, Rm = 16, T = 26, B = 50, XMAX = 300;
    const all = [...FORMATS.map((o) => ({ ...o, ...quick(o.f, p) })), { key: 'mine', name: 'Your format', short: 'Your format', mine: true, ...quick(mine().f, p) }];
    for (const o of all) { o.best = frontierMean(o.win, p); o.eff = o.best / o.mean; }
    const ws = all.map((o) => Math.min(o.win, MAXW));
    const lo = Math.max(logit(0.52), logit(Math.min(...ws)) - 0.3), hi = Math.min(logit(MAXW), logit(Math.max(...ws)) + 0.35);
    const x = (m) => L + Math.min(m, XMAX) / XMAX * (W - L - Rm);
    const y = (w) => T + (1 - (logit(Math.min(Math.max(w, 1e-9), MAXW)) - lo) / (hi - lo)) * (H - T - B);
    const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.classList.add('chart', 'frontier');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', `Chart: chance that the better player wins (log-odds scale) against the average number of points played, for each format, with the curve of the best possible format. The better player wins ${pct(p)} of points. The same numbers are in the table below.`);
    const add = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); for (const a in attrs) e.setAttribute(a, attrs[a]); if (text != null) e.textContent = text; svg.append(e); return e; };
    // axes
    let lastY = Infinity;
    for (const t of TICKS) { const lt = logit(t); if (lt < lo || lt > hi) continue; const yy = y(t); if (lastY - yy < 22) continue; lastY = yy;
      add('line', { x1: L, x2: W - Rm, y1: yy, y2: yy, class: 'grid' }); add('text', { x: L - 7, y: yy + 4, class: 'tick', 'text-anchor': 'end' }, pctTick(t)); }
    for (let m = 0; m <= XMAX; m += narrow ? 100 : 50) add('text', { x: x(m), y: H - B + 18, class: 'tick', 'text-anchor': 'middle' }, m);
    add('text', { x: (L + W - Rm) / 2, y: H - 8, class: 'axis', 'text-anchor': 'middle' }, 'points played, on average');
    add('text', { x: 4, y: 14, class: 'axis' }, 'chance the better player wins');
    // Wald's bound, and the whole-number "lead by k" formats that meet it
    let d = ''; const curve = [];
    for (let i = 1; i <= 800; i++) { const w = 1 / (1 + Math.exp(-(lo + (hi - lo) * i / 800))), m = frontierMean(w, p); if (m > XMAX) break;
      const px = x(m), py = y(w); d += `${d ? 'L' : 'M'}${px.toFixed(1)},${py.toFixed(1)}`; curve.push([px, py]); }
    add('path', { d, class: 'ref' });
    for (let k = 1; ; k++) { const l = leadBy(k, p); if (l.mean > XMAX || l.win > MAXW) break; if (logit(l.win) < lo) continue; add('circle', { cx: x(l.mean), cy: y(l.win), r: 2.5, fill: '#8b93a1' }); }
    // dots
    for (const o of all) {
      o.cx = x(o.mean); o.cy = y(o.win); o.off = o.mean > XMAX;
      if (o.mine) add('rect', { x: o.cx - 6, y: o.cy - 6, width: 12, height: 12, rx: 2, fill: '#2f6fb8', stroke: '#f3efe6', 'stroke-width': 2 });
      else add('circle', { cx: o.cx, cy: o.cy, r: 5.5, class: 'dot' });
    }
    // direct labels: the first free spot around each dot (then farther out, with a leader line); dots, labels, the
    // curve and leader lines are all obstacles. A label that finds no room is left out: tooltip and table still name it.
    const boxes = all.map((o) => ({ x0: o.cx - 7, x1: o.cx + 7, y0: o.cy - 7, y1: o.cy + 7 }));
    for (const [cx, cy] of curve) boxes.push({ x0: cx - 3, x1: cx + 3, y0: cy - 3, y1: cy + 3 });
    const hitsAny = (r) => r.x0 < L + 2 || r.x1 > W - 2 || r.y0 < T + 2 || r.y1 > H - B || boxes.some((q) => r.x0 < q.x1 && r.x1 > q.x0 && r.y0 < q.y1 && r.y1 > q.y0);
    const CH = 7.2, h = 15;
    for (const o of [all[all.length - 1], ...all.slice(0, -1)]) {
      const label = o.short + (o.off ? ' →' : ''), w = label.length * CH + 4;
      const c = [[o.cx + 10, o.cy - h / 2], [o.cx - 10 - w, o.cy - h / 2], [o.cx - w / 2, o.cy - 10 - h], [o.cx - w / 2, o.cy + 10],
        [o.cx + 8, o.cy - 8 - h], [o.cx + 8, o.cy + 8], [o.cx - 8 - w, o.cy - 8 - h], [o.cx - 8 - w, o.cy + 8]];
      for (const dd of [26, 44, 62]) c.push([o.cx - w / 2, o.cy + dd], [o.cx + 4, o.cy + dd], [o.cx - w + 4, o.cy + dd], [o.cx - w / 2, o.cy - dd - h], [o.cx + 4, o.cy - dd - h]);
      for (const [lx, ly] of c) {
        const r = { x0: lx, x1: lx + w, y0: ly, y1: ly + h }; if (hitsAny(r)) continue;
        let seg = null;
        if (r.y0 > o.cy + 20 || r.y1 < o.cy - 20) { const sx = Math.min(Math.max(o.cx, r.x0 + 4), r.x1 - 4);
          seg = r.y0 > o.cy ? { x0: Math.min(o.cx, sx) - 1, x1: Math.max(o.cx, sx) + 1, y0: o.cy + 8, y1: r.y0 - 1, sx, sy: r.y0 }
            : { x0: Math.min(o.cx, sx) - 1, x1: Math.max(o.cx, sx) + 1, y0: r.y1 + 1, y1: o.cy - 8, sx, sy: r.y1 };
          if (hitsAny(seg)) continue; boxes.push(seg);
          add('line', { x1: o.cx, y1: o.cy + (seg.sy > o.cy ? 7 : -7), x2: seg.sx, y2: seg.sy, stroke: '#8b93a1', 'stroke-width': 1 }); }
        boxes.push(r); add('text', { x: r.x0 + 2, y: r.y1 - 3, class: o.mine ? 'label strong' : 'label' }, label); break;
      }
    }
    for (const [cx, cy] of curve.filter((_, i) => i % 6 === 0).reverse()) { // name the curve where there is room
      const r = { x0: cx - 112, x1: cx - 6, y0: cy - 22, y1: cy - 7 };
      if (!hitsAny(r)) { add('text', { x: r.x1, y: r.y1 - 3, class: 'label', 'text-anchor': 'end' }, 'best possible'); break; }
    }
    // hover/focus targets last, so they sit on top
    for (const o of all) {
      const text = `<b>${o.name}</b><br>Better player wins ${pct(o.win, 1)}<br>${o.mean.toFixed(0)} points on average<br>Best possible for that: ${o.best.toFixed(0)} points (${pct(o.eff)} efficient)`;
      const hit = add('circle', { cx: o.cx, cy: o.cy, r: 14, class: 'hit', tabindex: 0, role: 'img', 'aria-label': text.replace(/<br>/g, '. ').replace(/<[^>]+>/g, '') });
      const show = () => { tip.hidden = false; tip.innerHTML = text; const bb = svg.getBoundingClientRect(), s = bb.width / W, left = o.cx * s + 16;
        tip.style.left = `${Math.max(0, left + 230 > bb.width ? o.cx * s - 246 : left)}px`; tip.style.top = `${Math.max(0, o.cy * s - 30)}px`; };
      hit.addEventListener('mouseenter', show); hit.addEventListener('focus', show); hit.addEventListener('click', show);
      hit.addEventListener('mouseleave', () => { tip.hidden = true; }); hit.addEventListener('blur', () => { tip.hidden = true; });
    }
    wrap.replaceChildren(svg, tip);
    const me = all[all.length - 1], t5 = all[0], md = mine().desc;
    readout.innerHTML = `${md}: the better player wins <span class="num">${pct(me.win, 1)}</span> of matches, after
      <span class="num">${me.mean.toFixed(0)}</span> points on average. The best possible format would need
      <span class="num">${me.best.toFixed(0)}</span> for that, so yours is <span class="num">${pct(me.eff)}</span> efficient.
      ${me.win >= t5.win && me.mean < t5.mean ? `<span class="good">It beats best-of-5 tennis: at least as accurate, with ${(t5.mean - me.mean).toFixed(0)} fewer points.</span>` : `Not yet better than best-of-5 tennis on both counts (${pct(t5.win, 1)} after ${t5.mean.toFixed(0)} points).`}`;
    table.querySelector('.tablewrap').innerHTML = `<table class="data"><thead><tr><th style="text-align:left">format</th><th>better player wins</th><th>points, average</th><th>best possible</th><th>efficiency</th></tr></thead><tbody>${all.map((o) => `<tr><td style="text-align:left">${o.name}</td><td>${pct(o.win, 1)}</td><td>${o.mean.toFixed(0)}</td><td>${o.best.toFixed(0)}</td><td>${pct(o.eff)}</td></tr>`).join('')}</tbody></table>`;
  }
  let raf = 0; const redraw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
  slider.addEventListener('input', redraw); des.addEventListener('change', redraw);
  let lastW = 0; new ResizeObserver(() => { const w = wrap.clientWidth; if ((w < 520) !== (lastW < 520) || !lastW) { lastW = w; redraw(); } }).observe(wrap);
  draw();
}
