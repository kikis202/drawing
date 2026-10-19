import { beforeAll, describe, expect, it } from 'vitest';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildForm } from '../../../src/geometry/build-form';
import { generateForm } from '../../../src/geometry/generate';
import { PRIMITIVES } from '../../../src/geometry/types';
import type { FormSpec, PrimitiveType } from '../../../src/geometry/types';
import {
  buildEdgeAdjacency,
  creaseSegments,
  silhouetteSegments,
} from '../../../src/render/edges';
import { getTestManifold } from '../../helpers/manifold';

let wasm: ManifoldToplevel;
beforeAll(async () => {
  wasm = await getTestManifold();
});

function single(type: PrimitiveType): FormSpec {
  return {
    version: 1,
    seed: 0,
    pieces: [{ type, size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
  };
}

describe('edge extraction', () => {
  it('cube has 12 creases (triangle diagonals excluded)', () => {
    const adj = buildEdgeAdjacency(buildForm(wasm, single('cube')));
    expect(creaseSegments(adj).length).toBe(12 * 6);
  });

  it('front view silhouette is the 4-edge outline', () => {
    const adj = buildEdgeAdjacency(buildForm(wasm, single('cube')));
    expect(silhouetteSegments(adj, [0, 0, 5]).length).toBe(4 * 6);
  });

  it('corner view silhouette is a hexagon', () => {
    const adj = buildEdgeAdjacency(buildForm(wasm, single('cube')));
    expect(silhouetteSegments(adj, [5, 5, 5]).length).toBe(6 * 6);
  });

  it('sphere has no creases', () => {
    const adj = buildEdgeAdjacency(buildForm(wasm, single('sphere')));
    expect(creaseSegments(adj).length).toBe(0);
  });

  it('generated forms are fully manifold', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const spec = generateForm(wasm, seed, { allowed: PRIMITIVES, pieces: 1 + (seed % 6) });
      expect(() => buildEdgeAdjacency(buildForm(wasm, spec))).not.toThrow();
    }
  });
});
