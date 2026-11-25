import { F, stats, leadBy, frontierMean, efficiency } from '../src/scoring.js';
const names = { tennisBo5: 'tennis best of 5 (Slam)', tennisBo3: 'tennis best of 3', noAdBo3: 'no-ad + match TB', ttBo7: 'table tennis bo7', ttBo5: 'table tennis bo5', badmintonBo3: 'badminton bo3', vbBo5: 'volleyball bo5', squashBo5: 'squash bo5', race21: 'race to 21', ttGame: 'one TT game', badmintonGame: 'one badminton game', tennisSet: 'one tennis set', advantageSet: 'advantage set' };
for (const p of [0.51, 0.53, 0.55, 0.6, 0.65]) {
  console.log('\np =', p);
  for (const [k, n] of Object.entries(names)) { const s = stats(F[k], p); console.log(n.padEnd(24), s.win.toFixed(3), s.mean.toFixed(0).padStart(4), 'eff', efficiency(F[k], p).toFixed(3), 'bound', frontierMean(s.win, p).toFixed(0)); }
}
// lead-by-k matching tennis bo5 at p=.55
const s = stats(F.tennisBo5, 0.55); for (let k = 1; k < 20; k++) { const l = leadBy(k, 0.55); if (l.win >= s.win) { console.log('\nlead by', k, l.win.toFixed(4), l.mean.toFixed(1), 'vs bo5', s.win.toFixed(4), s.mean.toFixed(1)); break; } }
