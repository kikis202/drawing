import type { Manifold, ManifoldToplevel } from './manifold';
import { pieceManifold } from './primitives';
import type { FormMesh, FormSpec, Piece, Vec3 } from './types';

/** Un-normalised union and subtraction of the pieces, in order. The caller owns the result and must call `.delete()`. */
export function buildManifold(wasm: ManifoldToplevel, pieces: Piece[]): Manifold {
  let result: Manifold | undefined;
  for (const piece of pieces) {
    const next = pieceManifold(wasm, piece);
    if (!result) {
      result = next;
      continue;
    }
    const combined = piece.op === 'cut' ? result.subtract(next) : result.add(next);
    result.delete();
    next.delete();
    result = combined;
  }
  if (!result) throw new Error('empty form');
  return result;
}

const AXIS_LENGTH = 1.3;

/** The local +Y unit vector turned by `rotation` as manifold's rotate does: X, then Y, then Z, about global axes. */
function localY(rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation.map((d) => (d * Math.PI) / 180);
  // about X: (0, 1, 0) -> (0, cos, sin)
  let x = 0;
  let y = Math.cos(rx);
  let z = Math.sin(rx);
  // about Y: x' = x cos + z sin, z' = -x sin + z cos
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  // about Z: x' = x cos - y sin, y' = x sin + y cos
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  return [x, y, z];
}

/** Un-normalised axis segments (xyz pairs) for every non-sphere piece, cutters included. */
function pieceAxes(pieces: Piece[]): number[] {
  const out: number[] = [];
  for (const piece of pieces) {
    if (piece.type === 'sphere') continue;
    const dir = localY(piece.rotation);
    const half = (piece.size[1] * AXIS_LENGTH) / 2;
    for (const sign of [-1, 1]) for (let k = 0; k < 3; k++) out.push(piece.position[k] + sign * half * dir[k]);
  }
  return out;
}

/** Clean uses 29 so a 60 degree hinged lid (exactly 30 from the side face) always counts as a crease. */
const CLEAN_CREASE_DEG = 29;
const FREEFORM_CREASE_DEG = 30;

/** Builds the form centred on its bounding box and scaled to bounding radius 1. */
export function buildForm(wasm: ManifoldToplevel, spec: FormSpec): FormMesh {
  const manifold = buildManifold(wasm, spec.pieces);
  try {
    const volume = manifold.volume();
    if (!(volume > 0)) throw new Error('empty form');

    const { min, max } = manifold.boundingBox();
    const centre = [0, 1, 2].map((k) => (min[k] + max[k]) / 2);
    const mesh = manifold.getMesh();
    const { numProp, vertProperties } = mesh;
    const count = vertProperties.length / numProp;

    let maxDistance = 0;
    for (let i = 0; i < count; i++) {
      const o = i * numProp;
      maxDistance = Math.max(
        maxDistance,
        Math.hypot(vertProperties[o] - centre[0], vertProperties[o + 1] - centre[1], vertProperties[o + 2] - centre[2]),
      );
    }
    const scale = 1 / maxDistance;

    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      for (let k = 0; k < 3; k++) {
        positions[i * 3 + k] = (vertProperties[i * numProp + k] - centre[k]) * scale;
      }
    }
    const norm = (v: number, k: number) => (v - centre[k]) * scale;
    const bounds = {
      min: [0, 1, 2].map((k) => norm(min[k], k)) as Vec3,
      max: [0, 1, 2].map((k) => norm(max[k], k)) as Vec3,
    };
    const axes = Float32Array.from(pieceAxes(spec.pieces), (v, i) => norm(v, i % 3));
    return { positions, indices: new Uint32Array(mesh.triVerts), volume: volume * scale ** 3, bounds, axes, creaseDeg: spec.style === 'clean' ? CLEAN_CREASE_DEG : FREEFORM_CREASE_DEG };
  } finally {
    manifold.delete();
  }
}
