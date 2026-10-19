import type { Manifold, ManifoldToplevel } from './manifold';
import { pieceManifold } from './primitives';
import type { FormMesh, FormSpec, Piece } from './types';

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
    return { positions, indices: new Uint32Array(mesh.triVerts), volume: volume * scale ** 3 };
  } finally {
    manifold.delete();
  }
}
