// Play one match, or a thousand, in a chosen format between a better player (wins share p of points) and a worse one.
import { quick } from '../src/scoring.js';
import { play } from '../src/play.js';
import { FORMATS } from './frontier.js';

export function mount(el, opts = {}) {
  el.innerHTML = `
    <div class="controls">
      <label>Format <select data-f>${FORMATS.map((o, i) => `<option value="${i}" ${o.key === (opts.format || 'tennisBo3') ? 'selected' : ''}>${o.name}</option>`).join('')}</select></label>
      <label>The better player wins <span class="num" data-v></span> of points
        <input type="range" min="50" max="58" step="1" value="${opts.p || 52}" aria-label="Share of points the better player wins"></label>
    </div>
    <div class="controls"><button class="primary" data-one>Play a match</button><button data-many>Play 1,000 matches</button></div>
    <div class="readout" aria-live="polite"><p class="note">Press a button to play.</p></div>`;
  const sel = el.querySelector('[data-f]'), slider = el.querySelector('input'), vOut = el.querySelector('[data-v]'), out = el.querySelector('.readout');
  const pp = () => +slider.value / 100, fmt = () => FORMATS[+sel.value];
  const sync = () => { vOut.textContent = `${slider.value}%`; }; sync();
  slider.addEventListener('input', () => { sync(); out.innerHTML = '<p class="note">Press a button to play.</p>'; });
  sel.addEventListener('change', () => { out.innerHTML = '<p class="note">Press a button to play.</p>'; });
  el.querySelector('[data-one]').addEventListener('click', () => {
    const p = pp(), r = play(fmt().f, p), even = p === 0.5;
    const who = (a) => even ? (a ? 'Player A' : 'Player B') : (a ? 'The better player' : 'The worse player');
    const fewer = r.aWon ? r.ptsA < r.ptsB : r.ptsB < r.ptsA, tie = r.ptsA === r.ptsB;
    out.innerHTML = `<p><span class="score">${r.line.join('&nbsp; ')}</span></p>
      <p>${who(r.aWon)} wins, scores from ${even ? 'A' : 'the better player'}'s side. Points won: <span class="num">${r.ptsA}</span> to
      <span class="num">${r.ptsB}</span>, ${r.ptsA + r.ptsB} in all.
      ${fewer ? '<span class="maybe">The winner won fewer points than the loser.</span>' : tie ? 'Both won the same number of points.' : ''}</p>`;
  });
  el.querySelector('[data-many]').addEventListener('click', () => {
    const p = pp(), f = fmt().f, N = 1000; let won = 0, fewer = 0, pts = 0;
    for (let i = 0; i < N; i++) { const r = play(f, p); if (r.aWon) won++; if (r.aWon ? r.ptsA < r.ptsB : r.ptsB < r.ptsA) fewer++; pts += r.ptsA + r.ptsB; }
    const ex = quick(f, p);
    out.innerHTML = `<p>${p === 0.5 ? `Player A won <span class="num">${won}</span> of 1,000 (two equal players).` : `The better player won <span class="num">${won}</span> of 1,000 matches
      (exactly: ${(100 * ex.win).toFixed(1)}% in the long run).`} In <span class="num">${fewer}</span> of them the winner won fewer points
      than the loser. Matches lasted <span class="num">${(pts / N).toFixed(0)}</span> points on average.</p>`;
  });
}
