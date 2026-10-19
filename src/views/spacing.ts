import type { View } from './types';

/** Ring-by-ring, top to bottom, turn ascending: evenly spread shots over the viewing sphere. */
export function ringViews(x: number): View[] {
  const a = Math.sqrt((4 * Math.PI) / x);
  const rings = Math.max(1, Math.round(Math.PI / a));
  const tilts = Array.from({ length: rings }, (_, i) => 90 - ((i + 0.5) * 180) / rings);
  const w = tilts.map((t) => Math.cos((t * Math.PI) / 180));
  const wSum = w.reduce((s, v) => s + v, 0);
  const share = w.map((v) => (x * v) / wSum);
  const n = share.map((s) => Math.max(1, Math.floor(s)));

  let extra = x - n.reduce((s, v) => s + v, 0);
  const order = share
    .map((s, i) => ({ i, frac: s - Math.floor(s) }))
    .sort((p, q) => q.frac - p.frac || w[q.i] - w[p.i] || p.i - q.i);
  for (let k = 0; extra > 0; k = (k + 1) % rings, extra--) n[order[k].i]++;
  for (; extra < 0; extra++) {
    let big = 0;
    for (let i = 1; i < rings; i++) if (n[i] > n[big]) big = i;
    n[big]--;
  }

  const views: View[] = [];
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < n[i]; j++) {
      views.push({ turn: (j * 360) / n[i] + 0, tilt: tilts[i] + 0 });
    }
  }
  return views;
}
