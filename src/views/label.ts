import { wrapTurn } from './pose';
import type { Shot, View } from './types';

function whole(v: View): View {
  // Round the magnitude so mirrored tilts (e.g. ±22.5) read with equal magnitudes.
  return {
    turn: wrapTurn(Math.round(wrapTurn(v.turn))),
    tilt: Math.sign(v.tilt) * Math.round(Math.abs(v.tilt)) + 0,
  };
}

export function viewLabel(v: View): string {
  const { turn, tilt } = whole(v);
  const sign = tilt < 0 ? '−' : '';
  return `${turn}° turn, ${sign}${Math.abs(tilt)}° tilt`;
}

export function shotLabel(shot: Shot): string {
  return shot.role === 'map' ? 'Top view (map)' : viewLabel(shot.view);
}

export function viewSlug(v: View): string {
  const { turn, tilt } = whole(v);
  const sign = tilt < 0 ? 'minus' : '';
  return `${turn}-turn-${sign}${Math.abs(tilt)}-tilt`;
}
