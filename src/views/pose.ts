import type { View } from './types';

const TURN_PER_PX = 0.4;
const TILT_PER_PX = 0.3;
const KEY_STEP = 5;
const KEY_STEP_SHIFT = 15;
const MAX_TILT = 89;

export function clampTilt(t: number): number {
  return Math.min(MAX_TILT, Math.max(-MAX_TILT, t));
}

export function wrapTurn(t: number): number {
  return (((t % 360) + 360) % 360) + 0; // + 0 turns −0 into 0
}

export function applyDrag(v: View, dxPx: number, dyPx: number): View {
  return {
    turn: wrapTurn(v.turn - dxPx * TURN_PER_PX),
    tilt: clampTilt(v.tilt + dyPx * TILT_PER_PX),
  };
}

export function applyKey(v: View, key: string, shift: boolean): View | null {
  const step = shift ? KEY_STEP_SHIFT : KEY_STEP;
  let { turn, tilt } = v;
  switch (key) {
    case 'ArrowRight':
      turn -= step;
      break;
    case 'ArrowLeft':
      turn += step;
      break;
    case 'ArrowDown':
      tilt += step;
      break;
    case 'ArrowUp':
      tilt -= step;
      break;
    default:
      return null;
  }
  return { turn: wrapTurn(turn), tilt: clampTilt(tilt) };
}

export function interpolateView(a: View, b: View, t: number): View {
  const delta = ((((b.turn - a.turn) % 360) + 540) % 360) - 180;
  return {
    turn: wrapTurn(a.turn + delta * t),
    tilt: a.tilt + (b.tilt - a.tilt) * t,
  };
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}
