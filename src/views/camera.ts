import type { Vec3 } from '../geometry/types';
import type { View } from './types';

export const FOV_DEG = 32;
// Distance at which a unit-radius form (plus margin) fills the vertical FOV.
export const DISTANCE = 1.15 / Math.sin((FOV_DEG / 2) * Math.PI / 180);

const RAD = Math.PI / 180;

export function cameraPosition(v: View): Vec3 {
  const turn = v.turn * RAD;
  const tilt = v.tilt * RAD;
  return [
    DISTANCE * Math.cos(tilt) * Math.sin(turn),
    DISTANCE * Math.sin(tilt),
    DISTANCE * Math.cos(tilt) * Math.cos(turn),
  ];
}

/** Vertical FOV that keeps the framing square identical: narrow views widen the FOV to fit the width. */
export function fovForAspect(aspect: number): number {
  if (aspect >= 1) return FOV_DEG;
  return (2 * Math.atan(Math.tan((FOV_DEG / 2) * RAD) / aspect)) / RAD;
}
