import type { Vec3 } from '../geometry/types';
import type { View } from './types';

export type Lens = 'flat' | 'normal' | 'wide';
/** Vertical FOV per lens, in degrees. */
export const LENS_FOV: Record<Lens, number> = { flat: 15, normal: 32, wide: 55 };

export const FOV_DEG = LENS_FOV.normal;

const RAD = Math.PI / 180;

/** Distance at which a unit-radius form (plus margin) fills the vertical FOV; same framing for every lens. */
export function lensDistance(lens: Lens): number {
  return 1.15 / Math.sin((LENS_FOV[lens] / 2) * RAD);
}

export const DISTANCE = lensDistance('normal');

export function cameraPosition(v: View, lens: Lens = 'normal'): Vec3 {
  const turn = v.turn * RAD;
  const tilt = v.tilt * RAD;
  const d = lensDistance(lens);
  return [d * Math.cos(tilt) * Math.sin(turn), d * Math.sin(tilt), d * Math.cos(tilt) * Math.cos(turn)];
}

/** Vertical FOV that keeps the framing square identical: narrow views widen the FOV to fit the width. */
export function fovForAspect(aspect: number, lens: Lens = 'normal'): number {
  const fov = LENS_FOV[lens];
  if (aspect >= 1) return fov;
  return (2 * Math.atan(Math.tan((fov / 2) * RAD) / aspect)) / RAD;
}
