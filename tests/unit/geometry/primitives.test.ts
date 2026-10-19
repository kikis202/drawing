import { describe, expect, it } from 'vitest';
import { pieceManifold } from '../../../src/geometry/primitives';
import { PRIMITIVES } from '../../../src/geometry/types';
import type { Piece, PrimitiveType } from '../../../src/geometry/types';
import { getTestManifold } from '../../helpers/manifold';

const piece = (type: PrimitiveType): Piece => ({
  type, size: [1.2, 0.8, 0.6], rotation: [0, 0, 0], position: [1, 2, 3], op: 'add',
});

/** Vertices relative to the piece position. */
async function vertices(type: PrimitiveType): Promise<number[][]> {
  const m = pieceManifold(await getTestManifold(), piece(type));
  const { numProp, vertProperties } = m.getMesh();
  m.delete();
  const out: number[][] = [];
  for (let i = 0; i < vertProperties.length; i += numProp) {
    out.push([vertProperties[i] - 1, vertProperties[i + 1] - 2, vertProperties[i + 2] - 3]);
  }
  return out;
}

describe('pieceManifold', () => {
  it.each(PRIMITIVES)('%s fills its size box, centred on its position', async (type) => {
    const m = pieceManifold(await getTestManifold(), piece(type));
    const { min, max } = m.boundingBox();
    expect(min).toEqual([expect.closeTo(0.4, 2), expect.closeTo(1.6, 2), expect.closeTo(2.7, 2)]);
    expect(max).toEqual([expect.closeTo(1.6, 2), expect.closeTo(2.4, 2), expect.closeTo(3.3, 2)]);
    m.delete();
  });

  it.each(['cone', 'pyramid'] as const)('%s points up (+Y)', async (type) => {
    const top = (await vertices(type)).reduce((a, b) => (b[1] > a[1] ? b : a));
    expect(top[1]).toBeCloseTo(0.4, 2);
    expect(Math.abs(top[0])).toBeLessThan(0.01);
    expect(Math.abs(top[2])).toBeLessThan(0.01);
  });

  it('cylinder stands along Y with round caps in the XZ plane', async () => {
    const verts = await vertices('cylinder');
    for (const [x, y, z] of verts) {
      expect(Math.abs(y)).toBeCloseTo(0.4, 2);
      expect((x / 0.6) ** 2 + (z / 0.3) ** 2).toBeCloseTo(1, 2);
    }
  });

  it('pyramid has a square base with sides aligned to X and Z', async () => {
    const base = (await vertices('pyramid')).sort((a, b) => a[1] - b[1]).slice(0, 4);
    for (const [x, y, z] of base) {
      expect(y).toBeCloseTo(-0.4, 2);
      expect(Math.abs(x)).toBeCloseTo(0.6, 2);
      expect(Math.abs(z)).toBeCloseTo(0.3, 2);
    }
    expect(new Set(base.map(([x, , z]) => `${Math.sign(x)},${Math.sign(z)}`)).size).toBe(4);
  });
});
