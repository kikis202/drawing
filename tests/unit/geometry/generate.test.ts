import { beforeAll, describe, expect, it } from 'vitest';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildForm, buildManifold } from '../../../src/geometry/build-form';
import { generateForm } from '../../../src/geometry/generate';
import { PRIMITIVES } from '../../../src/geometry/types';
import type { GenerateSettings, PrimitiveType } from '../../../src/geometry/types';
import { getTestManifold } from '../../helpers/manifold';

let wasm: ManifoldToplevel;
beforeAll(async () => {
  wasm = await getTestManifold();
});

const all: GenerateSettings = { allowed: PRIMITIVES, pieces: 3 };

describe('generateForm', () => {
  it('is deterministic for a seed and settings', () => {
    const a = generateForm(wasm, 42, { allowed: PRIMITIVES, pieces: 5 });
    const b = generateForm(wasm, 42, { allowed: PRIMITIVES, pieces: 5 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.seed).toBe(42);
    expect(a.version).toBe(1);
  });

  it('uses only allowed primitives', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const spec = generateForm(wasm, seed, { allowed: ['cone'], pieces: 4 });
      for (const piece of spec.pieces) expect(piece.type).toBe('cone');
    }
  });

  it('respects the piece count', () => {
    expect(generateForm(wasm, 7, { allowed: PRIMITIVES, pieces: 1 }).pieces).toHaveLength(1);
    for (let seed = 1; seed <= 20; seed++) {
      const n = generateForm(wasm, seed, { allowed: PRIMITIVES, pieces: 6 }).pieces.length;
      expect(n).toBeGreaterThanOrEqual(4);
      expect(n).toBeLessThanOrEqual(6);
    }
  });

  it('first piece is an add at the origin', () => {
    const [first] = generateForm(wasm, 3, all).pieces;
    expect(first.op).toBe('add');
    expect(first.position).toEqual([0, 0, 0]);
    expect(first.rotation).toEqual([0, 0, 0]);
  });

  it('keeps dimensions and rotations in range', () => {
    for (let seed = 1; seed <= 10; seed++) {
      for (const piece of generateForm(wasm, seed, { allowed: PRIMITIVES, pieces: 6 }).pieces) {
        for (const s of piece.size) {
          expect(s).toBeGreaterThanOrEqual(0.45);
          expect(s).toBeLessThanOrEqual(1.6);
        }
        for (const r of piece.rotation) {
          expect(r % 15).toBe(0);
          expect(r).toBeGreaterThanOrEqual(0);
          expect(r).toBeLessThanOrEqual(90);
        }
      }
    }
  });

  it('seed sweep: 300 seeds always give a valid single-piece form', () => {
    const subsets: PrimitiveType[][] = [PRIMITIVES, ['cube'], ['sphere', 'cone'], ['cylinder', 'pyramid', 'cube']];
    const start = performance.now();
    for (let seed = 1; seed <= 300; seed++) {
      const settings: GenerateSettings = { allowed: subsets[seed % subsets.length], pieces: (seed % 6) + 1 };
      const spec = generateForm(wasm, seed, settings);
      const m = buildManifold(wasm, spec.pieces);
      const parts = m.decompose();
      expect(parts).toHaveLength(1);
      parts.forEach((p) => p.delete());
      m.delete();
      expect(buildForm(wasm, spec).volume).toBeGreaterThan(0.05);
      for (const piece of spec.pieces) {
        for (const v of [...piece.position, ...piece.size, ...piece.rotation]) expect(Number.isFinite(v)).toBe(true);
      }
    }
    expect(performance.now() - start).toBeLessThan(20000);
  }, 60000);
});
