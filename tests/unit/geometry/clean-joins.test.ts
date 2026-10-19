import { beforeAll, describe, expect, it } from 'vitest';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildManifold } from '../../../src/geometry/build-form';
import { GRID, JOIN_SLOTS, MODULE, moduleSize, placeJoin, type Placed } from '../../../src/geometry/clean/joins';
import { pieceManifold } from '../../../src/geometry/primitives';
import { mulberry32 } from '../../../src/geometry/prng';
import { JOINS, PRIMITIVES, type JoinKind, type Piece, type PrimitiveType, type Vec3 } from '../../../src/geometry/types';
import { getTestManifold } from '../../helpers/manifold';

let wasm: ManifoldToplevel;
beforeAll(async () => {
  wasm = await getTestManifold();
});

const EPS = 1e-6;
const target: Piece = { type: 'cube', size: [1.5, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' };
const TMIN: Vec3 = [-0.75, -0.5, -0.5];
const TMAX: Vec3 = [0.75, 0.5, 0.5];

function ctx(seed: number, allowed: PrimitiveType[] = PRIMITIVES, pieces: Piece[] = [target]) {
  return { pieces, target: 0, allowed, rand: mulberry32(seed) };
}

/** Every non-null placement of `join` on the 1.5x1x1 box over all slots and a few seeds. */
function placements(join: JoinKind, allowed: PrimitiveType[] = PRIMITIVES): { slot: number; placed: Placed }[] {
  const out: { slot: number; placed: Placed }[] = [];
  for (let slot = 0; slot < JOIN_SLOTS[join]; slot++) {
    for (let seed = 1; seed <= 6; seed++) {
      const placed = placeJoin(join, slot, ctx(seed, allowed));
      if (placed) out.push({ slot, placed });
    }
  }
  return out;
}

/** World bounding box of a piece's size box (exact for every primitive at 90 degree turns). */
function box(piece: Piece): { min: Vec3; max: Vec3 } {
  const m = wasm.Manifold.cube(piece.size, true).rotate(piece.rotation).translate(piece.position);
  const { min, max } = m.boundingBox();
  m.delete();
  return { min: [...min] as Vec3, max: [...max] as Vec3 };
}

function components(pieces: Piece[]): number {
  const m = buildManifold(wasm, pieces);
  const parts = m.decompose();
  const n = parts.length;
  for (const p of parts) p.delete();
  m.delete();
  return n;
}

function volume(pieces: Piece[]): number {
  const m = buildManifold(wasm, pieces);
  const v = m.volume();
  m.delete();
  return v;
}

const onStep = (v: number, step: number) => Math.abs(v / step - Math.round(v / step)) < EPS;
const tilted = (p: Piece) => p.rotation.some((r) => !onStep(r, 90));

function expectClean(placed: Placed) {
  for (const p of placed.pieces) {
    for (const s of p.size) {
      expect(onStep(s, MODULE)).toBe(true);
      expect(s).toBeGreaterThanOrEqual(0.5);
      expect(s).toBeLessThanOrEqual(2);
    }
    if (!tilted(p)) for (const c of p.position) expect(onStep(c, GRID)).toBe(true);
    if (p.op === 'add') expect(Math.max(...p.size) / Math.min(...p.size)).toBeLessThanOrEqual(2.5 + EPS);
  }
  expect(components([target, ...placed.pieces])).toBe(1);
}

/** The axis along which `b` sits flush against a face of the target, or -1. */
function contactAxis(b: { min: Vec3; max: Vec3 }, sink = 0): number {
  for (let k = 0; k < 3; k++) {
    if (Math.abs(b.min[k] - (TMAX[k] - sink)) < EPS || Math.abs(b.max[k] - (TMIN[k] + sink)) < EPS) return k;
  }
  return -1;
}

function insideFace(b: { min: Vec3; max: Vec3 }, axis: number) {
  for (let k = 0; k < 3; k++) {
    if (k === axis) continue;
    expect(b.min[k]).toBeGreaterThanOrEqual(TMIN[k] - EPS);
    expect(b.max[k]).toBeLessThanOrEqual(TMAX[k] + EPS);
  }
}

describe('moduleSize', () => {
  it('returns multiples of 0.5 in range', () => {
    const rand = mulberry32(3);
    for (let i = 0; i < 50; i++) {
      const s = moduleSize(rand, 1, 2);
      expect([1, 1.5, 2]).toContain(s);
    }
  });

  it('clamps to [0.5, 2]', () => {
    const rand = mulberry32(5);
    for (let i = 0; i < 200; i++) {
      expect(moduleSize(rand, 0, 2)).toBeGreaterThanOrEqual(0.5);
      expect(moduleSize(rand, 0.5, 3)).toBeLessThanOrEqual(2);
    }
  });
});

describe('joins stay visible', () => {
  const targets: Piece[] = [
    target,
    { ...target, size: [1, 1, 1] },
    { ...target, size: [2, 1, 1.5] },
    { ...target, size: [1, 1.5, 0.5] },
    { ...target, size: [1, 0.5, 2], rotation: [0, 90, 0] },
  ];

  it('a box-on-box stack, wing or mirror never unions into a plain cuboid', () => {
    let checked = 0;
    for (const t of targets) {
      for (const join of ['stack', 'wing', 'mirror'] as JoinKind[]) {
        for (let slot = 0; slot < JOIN_SLOTS[join]; slot++) {
          for (let seed = 1; seed <= 6; seed++) {
            const placed = placeJoin(join, slot, ctx(seed, ['cube'], [t]));
            if (!placed) continue;
            checked++;
            const m = buildManifold(wasm, [t, ...placed.pieces]);
            const { min, max } = m.boundingBox();
            const aabb = (max[0] - min[0]) * (max[1] - min[1]) * (max[2] - min[2]);
            expect(m.volume()).toBeLessThan(aabb - 1e-6);
            m.delete();
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(100);
  });

  it('a cylinder stacked on a cylinder is narrower than it', () => {
    const cyls: Piece[] = [
      { type: 'cylinder', size: [1, 1.5, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' },
      { type: 'cylinder', size: [1.5, 1, 1.5], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' },
    ];
    let checked = 0;
    for (const t of cyls) {
      for (let slot = 0; slot < JOIN_SLOTS.stack; slot++) {
        for (let seed = 1; seed <= 10; seed++) {
          const placed = placeJoin('stack', slot, ctx(seed, ['cylinder'], [t]));
          if (!placed) continue;
          checked++;
          expect(placed.pieces[0].size[0]).toBeLessThan(t.size[0]);
        }
      }
    }
    expect(checked).toBeGreaterThan(0);
  });

  it('no two consecutive totem cylinders share a diameter', () => {
    for (const t of targets) {
      for (let slot = 0; slot < JOIN_SLOTS.totem; slot++) {
        for (let seed = 1; seed <= 20; seed++) {
          const placed = placeJoin('totem', slot, ctx(seed, PRIMITIVES, [t]));
          if (!placed) continue;
          const ps = placed.pieces;
          for (let i = 1; i < ps.length; i++) {
            if (ps[i].type === 'cylinder' && ps[i - 1].type === 'cylinder') {
              expect(ps[i].size[0]).toBeLessThan(ps[i - 1].size[0]);
            }
          }
        }
      }
    }
  });
});

describe('placeJoin on a 1.5x1x1 box', () => {
  it('stack: child stands on the top face, inside it, axis along the normal', () => {
    const all = placements('stack', ['cube', 'cylinder', 'cone', 'pyramid']);
    expect(all.length).toBeGreaterThan(0);
    for (const { placed } of all) {
      expectClean(placed);
      expect(placed.pieces).toHaveLength(1);
      expect(placed.pieces[0].rotation).toEqual([0, 0, 0]);
      const b = box(placed.pieces[0]);
      expect(contactAxis(b)).toBe(1);
      expect(b.min[1]).toBeCloseTo(TMAX[1], 9);
      insideFace(b, 1);
    }
  });

  it('stack: a sphere only sits on top, sunk 0.25', () => {
    const all = placements('stack', ['sphere']);
    expect(all.length).toBeGreaterThan(0);
    for (const { placed } of all) {
      expectClean(placed);
      expect(box(placed.pieces[0]).min[1]).toBeCloseTo(TMAX[1] - 0.25, 9);
    }
  });

  it('wing: flush on a side face and sharing the top or bottom plane', () => {
    const all = placements('wing');
    expect(all.length).toBeGreaterThan(0);
    for (const { placed } of all) {
      expectClean(placed);
      const b = box(placed.pieces[0]);
      expect(placed.pieces[0].type).toBe('cube');
      const axis = contactAxis(b);
      expect([0, 2]).toContain(axis);
      insideFace(b, axis);
      const top = Math.abs(b.max[1] - TMAX[1]) < EPS;
      const bottom = Math.abs(b.min[1] - TMIN[1]) < EPS;
      expect(top || bottom).toBe(true);
    }
  });

  it('halfSunk: half of the cylinder lies inside the box', () => {
    const all = placements('halfSunk');
    expect(all.length).toBeGreaterThan(0);
    for (const { placed } of all) {
      expectClean(placed);
      const piece = placed.pieces[0];
      expect(piece.type).toBe('cylinder');
      expect(piece.position[1]).toBeCloseTo(TMAX[1], 9);
      const c = pieceManifold(wasm, piece);
      const t = pieceManifold(wasm, target);
      const inside = c.intersect(t);
      const ratio = inside.volume() / c.volume();
      [c, t, inside].forEach((m) => m.delete());
      expect(ratio).toBeGreaterThan(0.475);
      expect(ratio).toBeLessThan(0.525);
    }
  });

  it('totem: 2-3 round pieces on the top-face centre, one shared axis', () => {
    const all = placements('totem');
    expect(all.length).toBeGreaterThan(0);
    for (const { slot, placed } of all) {
      expectClean(placed);
      expect(placed.pieces).toHaveLength(slot + 2);
      // only the cap may be a cone or a sphere
      for (const p of placed.pieces.slice(0, -1)) expect(p.type).toBe('cylinder');
      for (const p of placed.pieces) {
        expect(['cylinder', 'cone', 'sphere']).toContain(p.type);
        expect(p.position[0]).toBe(0);
        expect(p.position[2]).toBe(0);
        expect(p.rotation).toEqual([0, 0, 0]);
      }
    }
  });

  it('through: passes the centre and protrudes equally', () => {
    const all = placements('through');
    expect(all.length).toBeGreaterThan(0);
    for (const { placed } of all) {
      expectClean(placed);
      const piece = placed.pieces[0];
      expect(piece.position).toEqual([0, 0, 0]);
      const b = box(piece);
      const out = [0, 1, 2].filter((k) => b.max[k] > TMAX[k] + EPS);
      expect(out).toHaveLength(1);
      const k = out[0];
      expect(b.max[k] - TMAX[k]).toBeCloseTo(TMIN[k] - b.min[k], 9);
    }
  });

  it('mirror: two identical pieces mirrored across the centre plane', () => {
    const all = placements('mirror');
    expect(all.length).toBeGreaterThan(0);
    let acrossX = 0;
    for (const { placed } of all) {
      expectClean(placed);
      const [a, b] = placed.pieces;
      expect(placed.pieces).toHaveLength(2);
      expect(a.type).toBe(b.type);
      expect(a.size).toEqual(b.size);
      const k = [0, 1, 2].find((i) => a.position[i] !== b.position[i])!;
      expect(a.position[k]).toBeCloseTo(-b.position[k], 9);
      if (k === 0) acrossX++;
      for (const i of [0, 1, 2]) if (i !== k) expect(a.position[i]).toBe(b.position[i]);
      const ba = box(a);
      expect(contactAxis(ba)).toBe(k);
      insideFace(ba, k);
    }
    expect(acrossX).toBeGreaterThan(0);
  });

  it('hinged: a lid on a top edge, turned 30, 45 or 60 degrees', () => {
    const all = placements('hinged');
    expect(all.length).toBeGreaterThan(0);
    for (const { placed } of all) {
      expectClean(placed);
      const lid = placed.pieces[0];
      expect(lid.type).toBe('cube');
      const turns = lid.rotation.filter((r) => r !== 0).map(Math.abs);
      expect(turns).toHaveLength(1);
      expect([30, 45, 60]).toContain(turns[0]);
      // two corners of the lid lie on one top edge of the target
      const m = wasm.Manifold.cube(lid.size, true).rotate(lid.rotation).translate(lid.position);
      const v = m.getMesh().vertProperties;
      m.delete();
      let onEdge = 0;
      for (let i = 0; i < v.length; i += 3) {
        const atTop = Math.abs(v[i + 1] - TMAX[1]) < EPS;
        const atX = Math.abs(Math.abs(v[i]) - TMAX[0]) < EPS;
        const atZ = Math.abs(Math.abs(v[i + 2]) - TMAX[2]) < EPS;
        if (atTop && (atX || atZ)) onEdge++;
      }
      expect(onEdge).toBe(2);
    }
  });

  it('tilt45: a stacked piece turned 45 degrees about the contact normal', () => {
    const all = placements('tilt45');
    expect(all.length).toBeGreaterThan(0);
    for (const { placed } of all) {
      expectClean(placed);
      const piece = placed.pieces[0];
      expect(piece.rotation.some((r) => Math.abs(r) === 45)).toBe(true);
      const m = pieceManifold(wasm, piece);
      const { min, max } = m.boundingBox();
      m.delete();
      const axis = contactAxis({ min: [...min] as Vec3, max: [...max] as Vec3 });
      expect(axis).toBeGreaterThanOrEqual(0);
      insideFace({ min: [...min] as Vec3, max: [...max] as Vec3 }, axis);
    }
  });

  it('cut: removes 10-50% of the target and leaves one piece', () => {
    const all = placements('cut', ['sphere']);
    expect(all.length).toBeGreaterThan(0);
    const kinds = new Set<string>();
    for (const { placed } of all) {
      expectClean(placed);
      const cutter = placed.pieces[0];
      expect(placed.pieces).toHaveLength(1);
      expect(cutter.op).toBe('cut');
      kinds.add(cutter.type);
      const removed = 1 - volume([target, cutter]) / volume([target]);
      expect(removed).toBeGreaterThanOrEqual(0.1);
      expect(removed).toBeLessThanOrEqual(0.5);
    }
    expect(kinds).toEqual(new Set(['cylinder', 'cube']));
  });
});

describe('placeJoin edge cases', () => {
  it('halfSunk on a cylinder target is null', () => {
    const cyl: Piece = { type: 'cylinder', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' };
    expect(placeJoin('halfSunk', 0, ctx(1, PRIMITIVES, [cyl]))).toBeNull();
  });

  it('returns null when the join needs a type that is not allowed', () => {
    expect(placeJoin('halfSunk', 0, ctx(1, ['cube']))).toBeNull();
    expect(placeJoin('wing', 0, ctx(1, ['cylinder']))).toBeNull();
    expect(placeJoin('totem', 0, ctx(1, ['cube', 'pyramid']))).toBeNull();
    expect(placeJoin('totem', 0, ctx(1, ['sphere']))).toBeNull();
  });

  it('stacks and cuts a cylinder only along its axis', () => {
    const cyl: Piece = { type: 'cylinder', size: [1.5, 1, 1.5], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' };
    const on = (join: JoinKind, slot: number) => placeJoin(join, slot, ctx(4, PRIMITIVES, [cyl]));
    const top = on('stack', 0)!;
    expect(box(top.pieces[0]).min[1]).toBeCloseTo(0.5 - (top.pieces[0].type === 'sphere' ? 0.25 : 0), 9);
    expect(on('stack', 1)).toBeNull();
    expect(on('cut', 1)!.pieces[0].op).toBe('cut');
    expect(on('cut', 0)).toBeNull();
    expect(on('wing', 0)).toBeNull();
  });

  it('places on a target turned by 90 degrees using its world extent', () => {
    const turned: Piece = { ...target, rotation: [0, 90, 0] };
    const placed = placeJoin('stack', 0, ctx(2, ['cube'], [turned]))!;
    const b = box(placed.pieces[0]);
    expect(b.min[1]).toBeCloseTo(0.5, 9);
    expect(b.max[0] - b.min[0]).toBeLessThanOrEqual(1 + EPS);
    expect(b.max[2] - b.min[2]).toBeLessThanOrEqual(1.5 + EPS);
  });

  it('stack places children only on the top face', () => {
    const cyl: Piece = { type: 'cylinder', size: [1.5, 1, 1.5], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' };
    const targets: Piece[] = [
      target,
      { ...target, size: [1, 1.5, 2], rotation: [90, 0, 0] },
      { ...target, size: [2, 1, 1.5], rotation: [0, 0, 90], position: [0.25, 0, 0] },
      cyl,
      { ...cyl, size: [1.5, 2, 1.5], rotation: [180, 0, 0], position: [0, 0.25, 0] },
      { ...cyl, size: [1, 1.5, 1], rotation: [0, 0, 90] },
    ];
    const kinds = new Set<string>();
    for (const t of targets) {
      const top = box(t).max[1];
      for (let slot = 0; slot < JOIN_SLOTS.stack; slot++) {
        for (let seed = 1; seed <= 10; seed++) {
          const placed = placeJoin('stack', slot, ctx(seed, PRIMITIVES, [t]));
          if (!placed) continue;
          kinds.add(`${t.type} ${t.rotation.join(',')}`);
          const child = placed.pieces[0];
          // a sphere keeps its 0.25 sink into the top face
          const sink = child.type === 'sphere' ? 0.25 : 0;
          expect(Math.abs(box(child).min[1] - (top - sink)), JSON.stringify({ t, slot, seed })).toBeLessThan(1e-9);
        }
      }
    }
    expect(kinds.size).toBe(5);
  });

  it('half-sunk lids never overhang the box', () => {
    const targets: Piece[] = [
      target,
      { ...target, size: [2, 1, 1] },
      { ...target, size: [1, 1.5, 2] },
      { ...target, size: [1, 1, 2], rotation: [0, 90, 0] },
      { ...target, size: [2, 1.5, 1], rotation: [90, 0, 0], position: [0.25, 0, 0.25] },
    ];
    let flushEnd = 0;
    let checked = 0;
    for (const t of targets) {
      const tb = box(t);
      for (let slot = 0; slot < JOIN_SLOTS.halfSunk; slot++) {
        for (let seed = 1; seed <= 10; seed++) {
          const placed = placeJoin('halfSunk', slot, ctx(seed, PRIMITIVES, [t]));
          if (!placed) continue;
          checked++;
          const lid = placed.pieces[0];
          const b = box(lid);
          // turned about Z it lies along X, about X along Z
          const along = lid.rotation[2] !== 0 ? 0 : 2;
          expect(b.max[along] - b.min[along]).toBeCloseTo(lid.size[1], 9);
          for (const k of [0, 2]) {
            expect(b.min[k]).toBeGreaterThanOrEqual(tb.min[k] - EPS);
            expect(b.max[k]).toBeLessThanOrEqual(tb.max[k] + EPS);
          }
          expect(lid.position[1]).toBeCloseTo(tb.max[1], 9);
          const centred = Math.abs((b.min[along] + b.max[along]) / 2 - (tb.min[along] + tb.max[along]) / 2) < EPS;
          const atEnd = Math.abs(b.min[along] - tb.min[along]) < EPS || Math.abs(b.max[along] - tb.max[along]) < EPS;
          expect(centred || atEnd).toBe(true);
          if (!centred) flushEnd++;
        }
      }
    }
    expect(checked).toBeGreaterThan(50);
    expect(flushEnd).toBeGreaterThan(0);
  });

  it('a chest lid is centred and as long as its edge or one module shorter', () => {
    const targets: Piece[] = [target, { ...target, size: [2, 1, 1.5] }, { ...target, size: [1, 1.5, 2], rotation: [0, 90, 0] }];
    let checked = 0;
    for (const t of targets) {
      const tb = box(t);
      for (const slot of [18, 19]) {
        for (let seed = 1; seed <= 10; seed++) {
          const placed = placeJoin('halfSunk', slot, ctx(seed, PRIMITIVES, [t]));
          if (!placed) continue;
          checked++;
          const lid = placed.pieces[0];
          for (const c of lid.position) expect(onStep(c, GRID)).toBe(true);
          const along = slot === 18 ? 0 : 2;
          const edge = tb.max[along] - tb.min[along];
          expect([edge, edge - 0.5]).toContain(lid.size[1]);
          expect(lid.position[0]).toBeCloseTo((tb.min[0] + tb.max[0]) / 2, 9);
          expect(lid.position[2]).toBeCloseTo((tb.min[2] + tb.max[2]) / 2, 9);
          expect(lid.position[1]).toBeCloseTo(tb.max[1], 9);
        }
      }
    }
    expect(checked).toBeGreaterThan(20);
  });

  it('a target turned by other than 90 degrees gives null for every join', () => {
    const lid = placeJoin('hinged', 0, ctx(1))!.pieces[0];
    const tilt = placeJoin('tilt45', 0, ctx(1))!.pieces[0];
    for (const t of [lid, tilt]) {
      for (const join of JOINS) {
        for (let slot = 0; slot < JOIN_SLOTS[join]; slot++) {
          expect(placeJoin(join, slot, ctx(1, PRIMITIVES, [t]))).toBeNull();
        }
      }
    }
  });

  it('the same rand sequence gives the same pieces', () => {
    for (const join of JOINS) {
      for (let slot = 0; slot < JOIN_SLOTS[join]; slot++) {
        expect(placeJoin(join, slot, ctx(7))).toEqual(placeJoin(join, slot, ctx(7)));
      }
    }
  });
});
