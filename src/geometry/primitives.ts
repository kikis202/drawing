import type { Manifold, ManifoldToplevel } from './manifold';
import type { Piece, PrimitiveType, Vec3 } from './types';

// Manifold cylinders extrude along +Z, so a -90 degree turn about X stands them up (Y-up).
function rotated(m: Manifold, rotation: Vec3): Manifold {
  const r = m.rotate(rotation);
  m.delete();
  return r;
}

/** Unit-size primitive centred at the origin, Y-up. */
function unitPrimitive(wasm: ManifoldToplevel, type: PrimitiveType): Manifold {
  const { Manifold } = wasm;
  switch (type) {
    case 'cube':
      return Manifold.cube([1, 1, 1], true);
    case 'sphere':
      return Manifold.sphere(0.5, 48);
    case 'cylinder':
      return rotated(Manifold.cylinder(1, 0.5, 0.5, 48, true), [-90, 0, 0]);
    case 'cone':
      return rotated(Manifold.cylinder(1, 0.5, 0, 48, true), [-90, 0, 0]);
    case 'pyramid':
      return rotated(Manifold.cylinder(1, Math.SQRT1_2, 0, 4, true), [-90, 45, 0]);
  }
}

/** The caller owns the result and must call `.delete()`. */
export function pieceManifold(wasm: ManifoldToplevel, piece: Piece): Manifold {
  const unit = unitPrimitive(wasm, piece.type);
  const scaled = unit.scale(piece.size);
  unit.delete();
  const turned = rotated(scaled, piece.rotation);
  const placed = turned.translate(piece.position);
  turned.delete();
  return placed;
}
