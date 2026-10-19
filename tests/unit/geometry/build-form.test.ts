import { beforeAll, describe, expect, it } from 'vitest';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildForm, buildManifold } from '../../../src/geometry/build-form';
import type { Piece, Vec3 } from '../../../src/geometry/types';
import { getTestManifold } from '../../helpers/manifold';

let wasm: ManifoldToplevel;
beforeAll(async () => {
  wasm = await getTestManifold();
});

function cube(position: Vec3, op: 'add' | 'cut' = 'add'): Piece {
  return { type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position, op };
}

describe('buildManifold', () => {
  it('unions two overlapping cubes', () => {
    const m = buildManifold(wasm, [cube([0, 0, 0]), cube([0.5, 0, 0])]);
    expect(m.volume()).toBeCloseTo(1.5, 4);
    m.delete();
  });

  it('cuts a notch', () => {
    const m = buildManifold(wasm, [cube([0, 0, 0]), cube([0.5, 0.5, 0], 'cut')]);
    expect(m.volume()).toBeCloseTo(0.75, 4);
    m.delete();
  });

  it('applies piece rotation about Y after scaling', () => {
    const piece: Piece = {
      type: 'cube',
      size: [1.2, 0.8, 0.6],
      rotation: [0, 90, 0],
      position: [0, 0, 0],
      op: 'add',
    };
    const m = buildManifold(wasm, [piece]);
    const { min, max } = m.boundingBox();
    expect(max[0]).toBeCloseTo(0.3, 2);
    expect(min[0]).toBeCloseTo(-0.3, 2);
    expect(max[2]).toBeCloseTo(0.6, 2);
    expect(min[2]).toBeCloseTo(-0.6, 2);
    m.delete();
  });
});

describe('buildForm', () => {
  it('normalises to centre and unit bounding radius', () => {
    const box: Piece = { ...cube([5, 5, 5]), size: [2, 1, 1] };
    const form = buildForm(wasm, { version: 1, seed: 1, pieces: [box] });
    let maxDist = 0;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < form.positions.length; i += 3) {
      const v = [form.positions[i], form.positions[i + 1], form.positions[i + 2]];
      maxDist = Math.max(maxDist, Math.hypot(v[0], v[1], v[2]));
      for (let k = 0; k < 3; k++) {
        lo[k] = Math.min(lo[k], v[k]);
        hi[k] = Math.max(hi[k], v[k]);
      }
    }
    expect(Math.abs(maxDist - 1)).toBeLessThan(1e-4);
    for (let k = 0; k < 3; k++) expect((lo[k] + hi[k]) / 2).toBeCloseTo(0, 4);
  });

  it('returns shared vertices (manifold topology)', () => {
    const form = buildForm(wasm, { version: 1, seed: 1, pieces: [cube([0, 0, 0])] });
    expect(form.positions.length / 3).toBe(8);
    expect(form.indices.length / 3).toBe(12);
  });

  it('volume is scaled with the normalisation', () => {
    const form = buildForm(wasm, { version: 1, seed: 1, pieces: [cube([0, 0, 0])] });
    expect(form.volume).toBeCloseTo((2 / Math.sqrt(3)) ** 3, 3);
  });

  it('throws on an empty form', () => {
    const spec = { version: 1 as const, seed: 1, pieces: [cube([0, 0, 0]), cube([0, 0, 0], 'cut')] };
    expect(() => buildForm(wasm, spec)).toThrow('empty form');
  });
});
