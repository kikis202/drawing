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
    const form = buildForm(wasm, { version: 2, style: 'freeform', seed: 1, pieces: [box] });
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
    const form = buildForm(wasm, { version: 2, style: 'freeform', seed: 1, pieces: [cube([0, 0, 0])] });
    expect(form.positions.length / 3).toBe(8);
    expect(form.indices.length / 3).toBe(12);
  });

  it('volume is scaled with the normalisation', () => {
    const form = buildForm(wasm, { version: 2, style: 'freeform', seed: 1, pieces: [cube([0, 0, 0])] });
    expect(form.volume).toBeCloseTo((2 / Math.sqrt(3)) ** 3, 3);
  });

  it('throws on an empty form', () => {
    const spec = { version: 2 as const, style: 'freeform' as const, seed: 1, pieces: [cube([0, 0, 0]), cube([0, 0, 0], 'cut')] };
    expect(() => buildForm(wasm, spec)).toThrow('empty form');
  });
});

function spec(pieces: Piece[]) {
  return { version: 2 as const, style: 'freeform' as const, seed: 1, pieces };
}

function axisDirection(axes: Float32Array, i = 0): Vec3 {
  const o = i * 6;
  const d: Vec3 = [axes[o + 3] - axes[o], axes[o + 4] - axes[o + 1], axes[o + 5] - axes[o + 2]];
  const len = Math.hypot(...d);
  return [d[0] / len, d[1] / len, d[2] / len];
}

describe('buildForm bounds and axes', () => {
  it('bounds are the normalised bounding box', () => {
    const box: Piece = { ...cube([5, 5, 5]), size: [2, 1, 1] };
    const { bounds } = buildForm(wasm, spec([box]));
    const n = Math.hypot(1, 0.5, 0.5);
    expect(bounds.max[0]).toBeCloseTo(1 / n, 4);
    expect(bounds.max[1]).toBeCloseTo(0.5 / n, 4);
    expect(bounds.max[2]).toBeCloseTo(0.5 / n, 4);
    for (let k = 0; k < 3; k++) expect(bounds.min[k]).toBeCloseTo(-bounds.max[k], 4);
  });

  it("axes run along each piece's local Y, 1.3x its height", () => {
    const cyl: Piece = { type: 'cylinder', size: [1, 2, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' };
    const form = buildForm(wasm, spec([cyl]));
    const scale = 1 / Math.hypot(0.5, 1); // max vertex distance of the un-normalised cylinder
    expect(form.axes).toHaveLength(6);
    const [x0, y0, z0, x1, y1, z1] = form.axes;
    expect(x0).toBeCloseTo(0, 4);
    expect(z0).toBeCloseTo(0, 4);
    expect(x1).toBeCloseTo(0, 4);
    expect(z1).toBeCloseTo(0, 4);
    expect(Math.abs(y0)).toBeCloseTo(1.3 * scale, 3);
    expect(y1).toBeCloseTo(-y0, 4);
  });

  it('rotated pieces rotate their axis', () => {
    const turned: Piece = { ...cube([0, 0, 0]), size: [1, 2, 1], rotation: [90, 0, 0] };
    const d = axisDirection(buildForm(wasm, spec([turned])).axes);
    expect(Math.abs(d[2])).toBeCloseTo(1, 4);
    expect(d[0]).toBeCloseTo(0, 4);
    expect(d[1]).toBeCloseTo(0, 4);
  });

  it('matches the direction of the manifold mesh for non-trivial rotations', () => {
    const rotations: Vec3[] = [[0, 0, 90], [0, 30, 90], [90, 0, 90], [30, 40, 50]];
    for (const rotation of rotations) {
      const tall: Piece = { type: 'cylinder', size: [0.1, 4, 0.1], rotation, position: [0, 0, 0], op: 'add' };
      const form = buildForm(wasm, spec([tall]));
      const d = axisDirection(form.axes);
      // a tall thin cylinder's farthest vertex lies along its axis
      let far: Vec3 = [0, 0, 0];
      let best = 0;
      for (let i = 0; i < form.positions.length; i += 3) {
        const r = Math.hypot(form.positions[i], form.positions[i + 1], form.positions[i + 2]);
        if (r > best) {
          best = r;
          far = [form.positions[i], form.positions[i + 1], form.positions[i + 2]];
        }
      }
      const dot = (far[0] * d[0] + far[1] * d[1] + far[2] * d[2]) / best;
      expect(Math.abs(dot), `rotation ${rotation}`).toBeGreaterThan(0.995);
    }
    const lone: Piece = { type: 'cylinder', size: [0.1, 4, 0.1], rotation: [0, 0, 90], position: [0, 0, 0], op: 'add' };
    expect(Math.abs(axisDirection(buildForm(wasm, spec([lone])).axes)[0])).toBeCloseTo(1, 4);
  });

  it('spheres have no axis; cutters do', () => {
    const sphere: Piece = { type: 'sphere', size: [2, 2, 2], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' };
    const cut: Piece = { type: 'cylinder', size: [0.5, 3, 0.5], rotation: [0, 0, 0], position: [0, 0, 0], op: 'cut' };
    expect(buildForm(wasm, spec([sphere, cut])).axes).toHaveLength(6);
  });
});
