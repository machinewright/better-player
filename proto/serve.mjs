// Serve effect at a fixed overall edge: A wins 55% of all points on average, servers win s+-0.05 on serve.
// Prints best-of-3 (7-point tiebreaks in every set, like the i.i.d. tennisBo3 in NUMBERS.txt).
import { match } from './tennis.mjs';
for (const s of [0.5, 0.6, 0.65]) {
  const [w, n] = match(s + 0.05, s - 0.05, 3, 7, 7);
  console.log(`serve-effect bo3 p=0.55 servers ${(s + 0.05).toFixed(2)}/${(s - 0.05).toFixed(2)}: ${(100 * w).toFixed(1)}% after ${n.toFixed(1)} pts`);
}
