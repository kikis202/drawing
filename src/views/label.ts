import { wrapTurn } from './pose';
import type { View } from './types';

function whole(v: View): View {
  return { turn: wrapTurn(Math.round(wrapTurn(v.turn))), tilt: Math.round(v.tilt) + 0 };
}

export function viewLabel(v: View): string {
  const { turn, tilt } = whole(v);
  const sign = tilt < 0 ? '−' : '';
  return `${turn}° turn, ${sign}${Math.abs(tilt)}° tilt`;
}

export function viewSlug(v: View): string {
  const { turn, tilt } = whole(v);
  const sign = tilt < 0 ? 'minus' : '';
  return `${turn}-turn-${sign}${Math.abs(tilt)}-tilt`;
}
