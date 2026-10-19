import { beforeAll, describe, expect, it } from 'vitest';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildForm, buildManifold } from '../../../src/geometry/build-form';
import { pieceManifold } from '../../../src/geometry/primitives';
import {
  LEVELS,
  generateCleanForm,
  levelNote,
  varyCleanForm,
  type CleanSettings,
  type Level,
} from '../../../src/geometry/clean/generate-clean';
import { mulberry32 } from '../../../src/geometry/prng';
import { JOINS, PRIMITIVES, type FormSpec, type JoinKind, type PrimitiveType } from '../../../src/geometry/types';
import { buildEdgeAdjacency } from '../../../src/render/edges';
import { getTestManifold } from '../../helpers/manifold';

let wasm: ManifoldToplevel;
beforeAll(async () => {
  wasm = await getTestManifold();
});

const EPS = 1e-6;
const LEVEL_IDS: Level[] = [1, 2, 3, 4, 5, 6];
const all = (level: Level): CleanSettings => ({ level, allowed: PRIMITIVES, joins: JOINS });

/** The five Clean exercises, from the spec table "Exercises (presets)". */
const EXERCISE_SETTINGS: CleanSettings[] = [
  { level: 1, allowed: ['cube'], joins: [] },
  { level: 3, allowed: ['cube', 'cylinder', 'cone', 'pyramid'], joins: ['stack', 'totem'] },
  { level: 6, allowed: ['cube', 'cylinder'], joins: ['stack', 'halfSunk', 'hinged'] },
  { level: 4, allowed: ['cube', 'cylinder', 'cone', 'pyramid'], joins: ['through', 'wing', 'mirror'] },
  { level: 5, allowed: ['cube', 'cylinder'], joins: ['cut'] },
];

const adds = (spec: FormSpec) => spec.pieces.filter((p) => p.op === 'add');
const steps = (spec: FormSpec) => (spec.recipe ?? []).filter((s) => s.join !== 'base');
const onStep = (v: number, step: number) => Math.abs(v / step - Math.round(v / step)) < EPS;
const tilted = (spec: FormSpec) => spec.pieces.filter((p) => p.rotation.some((r) => !onStep(r, 90)));

/** Pieces per recipe step. */
const stepSize = (join: string, slot: number) => (join === 'mirror' ? 2 : join === 'totem' ? slot + 2 : 1);

/** True when every step of `spec` keeps the strict rules: >= 8% growth, cut 10-50% of its target, 2 : 1 extent. */
function passesRules(spec: FormSpec): boolean {
  let n = 0;
  let volume = 0;
  for (const step of spec.recipe!) {
    const k = stepSize(step.join, step.slot);
    const pieces = spec.pieces.slice(0, n + k);
    if (pieces.length < n + k) return false;
    const m = buildManifold(wasm, pieces);
    const v = m.volume();
    const { min, max } = m.boundingBox();
    m.delete();
    const ext = [0, 1, 2].map((i) => max[i] - min[i]);
    if (Math.max(...ext) > 2 * Math.min(...ext) + EPS) return false;
    if (step.join === 'cut') {
      const t = pieceManifold(wasm, spec.pieces[step.target]);
      const c = pieceManifold(wasm, spec.pieces[n]);
      const both = t.intersect(c);
      const removed = both.volume() / t.volume();
      [t, c, both].forEach((x) => x.delete());
      if (removed < 0.1 - EPS || removed > 0.5 + EPS) return false;
    } else if (step.join !== 'base' && v < 1.08 * volume - EPS) return false;
    volume = v;
    n += k;
  }
  return n === spec.pieces.length;
}

function randomSettings(rand: () => number): CleanSettings {
  const level = (1 + Math.floor(rand() * 6)) as Level;
  let allowed = PRIMITIVES.filter(() => rand() < 0.5);
  if (allowed.length === 0) allowed = [PRIMITIVES[Math.floor(rand() * PRIMITIVES.length)]];
  const joins = JOINS.filter(() => rand() < 0.5);
  return { level, allowed, joins };
}

describe('LEVELS', () => {
  it('matches the spec table', () => {
    expect(LEVELS[1]).toMatchObject({ name: 'One shape, varied proportions', pieces: [1, 1], joins: [] });
    expect(LEVELS[2]).toMatchObject({ name: 'Boxes only, joined flush', pieces: [2, 2], boxesOnly: true });
    expect(LEVELS[3].name).toBe('Mixed shapes, stacked and joined');
    expect(LEVELS[4].name).toBe('Adds mirror pairs and totems');
    expect(LEVELS[5]).toMatchObject({ name: 'Adds one clean cut', pieces: [3, 5], extra: ['cut'] });
    expect(LEVELS[6]).toMatchObject({ name: 'Adds one tilted or hinged piece', pieces: [3, 6], extra: ['hinged', 'tilt45'] });
    expect(new Set(LEVELS[2].joins)).toEqual(new Set(['stack', 'wing']));
    expect(new Set(LEVELS[3].joins)).toEqual(new Set(['stack', 'totem', 'halfSunk', 'wing']));
    expect(new Set(LEVELS[4].joins)).toEqual(new Set(['stack', 'totem', 'halfSunk', 'wing', 'through', 'mirror']));
    expect(new Set(LEVELS[5].joins)).toEqual(new Set([...LEVELS[4].joins, 'cut']));
    expect(new Set(LEVELS[6].joins)).toEqual(new Set(JOINS));
  });
});

describe('generateCleanForm', () => {
  it('is deterministic for seed, variation and settings', () => {
    for (const settings of [all(4), all(6), EXERCISE_SETTINGS[2]]) {
      const a = generateCleanForm(wasm, 42, settings);
      const b = generateCleanForm(wasm, 42, settings);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(a).toMatchObject({ version: 2, seed: 42, style: 'clean', variation: 0 });
      expect(a.recipe![0].join).toBe('base');
      expect(JSON.stringify(varyCleanForm(wasm, a))).toBe(JSON.stringify(varyCleanForm(wasm, b)));
    }
    expect(JSON.stringify(generateCleanForm(wasm, 42, all(4)))).not.toBe(JSON.stringify(generateCleanForm(wasm, 43, all(4))));
  });

  it('level 1 is one piece; level 2 is boxes only', () => {
    for (let seed = 1; seed <= 20; seed++) {
      expect(generateCleanForm(wasm, seed, all(1)).pieces).toHaveLength(1);
      const two = generateCleanForm(wasm, seed, all(2));
      expect(two.pieces).toHaveLength(2);
      for (const p of two.pieces) expect(p.type).toBe('cube');
    }
  });

  it("respects each level's piece range", () => {
    for (const level of LEVEL_IDS) {
      const [lo, hi] = LEVELS[level].pieces;
      for (let seed = 1; seed <= 30; seed++) {
        const n = adds(generateCleanForm(wasm, seed, all(level))).length;
        expect(n).toBeGreaterThanOrEqual(lo);
        expect(n).toBeLessThanOrEqual(hi);
      }
    }
  }, 20_000);

  it('uses only enabled joins allowed by the level', () => {
    const rand = mulberry32(99);
    for (let i = 0; i < 60; i++) {
      const settings = randomSettings(rand);
      const spec = generateCleanForm(wasm, i + 1, settings);
      for (const step of steps(spec)) {
        expect(settings.joins).toContain(step.join);
        expect(LEVELS[settings.level].joins).toContain(step.join);
      }
      for (const p of adds(spec)) {
        if (settings.level <= 2) expect(p.type).not.toBe('sphere');
      }
    }
  }, 20_000);

  it('level 5 has exactly one cut when Clean cut is on, none when off', () => {
    const noCut = JOINS.filter((j) => j !== 'cut');
    for (let seed = 1; seed <= 20; seed++) {
      const on = generateCleanForm(wasm, seed, all(5));
      expect(steps(on).filter((s) => s.join === 'cut')).toHaveLength(1);
      expect(on.pieces.filter((p) => p.op === 'cut')).toHaveLength(1);
      expect(on.pieces[on.pieces.length - 1].op).toBe('cut');
      const off = generateCleanForm(wasm, seed, { ...all(5), joins: noCut });
      expect(off.pieces.filter((p) => p.op === 'cut')).toHaveLength(0);
    }
  }, 20_000);

  it('level 6 has exactly one hinged lid or 45° piece when either is on', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const spec = generateCleanForm(wasm, seed, all(6));
      expect(steps(spec).filter((s) => s.join === 'hinged' || s.join === 'tilt45')).toHaveLength(1);
      expect(tilted(spec)).toHaveLength(1);
      expect(spec.pieces.filter((p) => p.op === 'cut').length).toBeLessThanOrEqual(1);
      // a chest is closed (a half-sunk lid) or open (one hinged lid), never a 45° piece
      const lid = generateCleanForm(wasm, seed, EXERCISE_SETTINGS[2]);
      expect(steps(lid).filter((s) => s.join === 'hinged').length).toBeLessThanOrEqual(1);
      expect(steps(lid).filter((s) => s.join === 'tilt45')).toHaveLength(0);
    }
  }, 20_000);

  it('a totem stands on a box base', () => {
    let totems = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const spec = generateCleanForm(wasm, seed, EXERCISE_SETTINGS[1]);
      for (const step of steps(spec)) {
        if (step.join !== 'totem') continue;
        totems++;
        expect(step.target).toBe(0);
        expect(spec.pieces[0].type).toBe('cube');
        // level 3 totems are base + 2 round pieces
        expect(step.slot).toBe(0);
      }
    }
    expect(totems).toBeGreaterThan(0);
  });

  it('stacks and totems preset usually has a totem', () => {
    let totems = 0;
    for (let seed = 1; seed <= 200; seed++) {
      if (steps(generateCleanForm(wasm, seed, EXERCISE_SETTINGS[1])).some((s) => s.join === 'totem')) totems++;
    }
    expect(totems).toBeGreaterThanOrEqual(120);
  }, 60_000);

  it('chests and lids makes closed and open chests', () => {
    let closed = 0;
    let open = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const spec = generateCleanForm(wasm, seed, EXERCISE_SETTINGS[2]);
      const joins = steps(spec).map((s) => s.join);
      if (joins.includes('hinged')) open++;
      else if (joins.includes('halfSunk')) closed++;
      else throw new Error(`seed ${seed} is neither: ${joins.join(', ')}`);
      expect(levelNote(EXERCISE_SETTINGS[2])).toBeNull();
    }
    expect(closed).toBeGreaterThanOrEqual(70);
    expect(open).toBeGreaterThanOrEqual(70);
  }, 60_000);

  it('variation keeps the recipe and changes proportions', () => {
    let changed = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const spec = generateCleanForm(wasm, seed, all(4));
      const next = varyCleanForm(wasm, spec);
      expect(next.recipe).toEqual(spec.recipe);
      expect(next.seed).toBe(spec.seed);
      expect(next.style).toBe('clean');
      expect(next.variation).toBeGreaterThan(0);
      const again = varyCleanForm(wasm, next);
      expect(again.recipe).toEqual(spec.recipe);
      expect(again.variation).toBeGreaterThan(next.variation!);
      if (JSON.stringify(next.pieces) !== JSON.stringify(spec.pieces)) changed++;
    }
    expect(changed).toBeGreaterThanOrEqual(8);
  });

  it('variation of every exercise keeps the strict rules in at least 99% of seeds', () => {
    for (const settings of EXERCISE_SETTINGS) {
      let ok = 0;
      for (let seed = 1; seed <= 200; seed++) {
        if (passesRules(varyCleanForm(wasm, generateCleanForm(wasm, seed, settings)))) ok++;
      }
      expect(ok, JSON.stringify(settings)).toBeGreaterThanOrEqual(198);
    }
  }, 120_000);

  it('chained variations build as one piece along the renderer path and always move on', () => {
    // Chests seed 43 once reached variations whose half-sunk cylinder touched its box along tangent lines: one
    // piece step by step, two under buildManifold
    let spec = generateCleanForm(wasm, 43, EXERCISE_SETTINGS[2]);
    for (let i = 0; i < 40; i++) {
      const next = varyCleanForm(wasm, spec);
      expect(next.variation).toBeGreaterThan(spec.variation!);
      const m = buildManifold(wasm, next.pieces);
      const parts = m.decompose();
      expect(parts.length, `variation ${next.variation}`).toBe(1);
      parts.forEach((p) => p.delete());
      m.delete();
      spec = next;
    }
  }, 30_000);

  it('chests and lids has a hinged or chest lid in at least 99% of seeds', () => {
    let lids = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const joins = steps(generateCleanForm(wasm, seed, EXERCISE_SETTINGS[2]));
      if (joins.some((s) => s.join === 'hinged' || (s.join === 'halfSunk' && s.slot >= 18))) lids++;
    }
    expect(lids).toBeGreaterThanOrEqual(297);
  }, 60_000);

  it('dimensions are on the module and positions on the grid', () => {
    for (const level of LEVEL_IDS) {
      for (let seed = 1; seed <= 15; seed++) {
        const spec = generateCleanForm(wasm, seed, all(level));
        for (const form of [spec, varyCleanForm(wasm, spec)]) {
          const turned = tilted(form);
          expect(turned.length).toBeLessThanOrEqual(level === 6 ? 1 : 0);
          for (const p of form.pieces) {
            for (const s of p.size) {
              expect(onStep(s, 0.5)).toBe(true);
              expect(s).toBeGreaterThanOrEqual(0.5);
              expect(s).toBeLessThanOrEqual(2);
            }
            if (!turned.includes(p)) for (const c of p.position) expect(onStep(c, 0.25)).toBe(true);
          }
        }
      }
    }
  }, 20_000);

  it('never throws on any non-empty allowed', () => {
    for (const level of LEVEL_IDS) {
      for (const t of PRIMITIVES as PrimitiveType[]) {
        const spec = generateCleanForm(wasm, 5, { level, allowed: [t], joins: JOINS });
        expect(spec.pieces.length).toBeGreaterThan(0);
      }
    }
  }, 20_000);

  it('every exercise and random customised settings generate valid forms', () => {
    const start = performance.now();
    const cases: { seed: number; settings: CleanSettings }[] = [];
    for (const settings of EXERCISE_SETTINGS) for (let seed = 1; seed <= 40; seed++) cases.push({ seed, settings });
    const rand = mulberry32(7);
    for (let i = 0; i < 100; i++) cases.push({ seed: 1000 + i, settings: randomSettings(rand) });

    for (const { seed, settings } of cases) {
      const spec = generateCleanForm(wasm, seed, settings);
      const label = `${seed} ${JSON.stringify(settings)}`;
      const m = buildManifold(wasm, spec.pieces);
      const parts = m.decompose();
      const count = parts.length;
      parts.forEach((p) => p.delete());
      const { min, max } = m.boundingBox();
      m.delete();
      expect(count, label).toBe(1);
      const ext = [0, 1, 2].map((k) => max[k] - min[k]);
      expect(Math.max(...ext) / Math.min(...ext), label).toBeLessThanOrEqual(2 + EPS);
      const mesh = buildForm(wasm, spec);
      expect(mesh.volume, label).toBeGreaterThan(0.05);
      expect(() => buildEdgeAdjacency(mesh), label).not.toThrow();
    }
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(30_000);
  }, 60_000);
});

describe('levelNote', () => {
  it('levelNote explains a skipped extra join', () => {
    const noCut: JoinKind[] = JOINS.filter((j) => j !== 'cut');
    expect(levelNote({ level: 5, allowed: PRIMITIVES, joins: noCut })).toBe('Level 5 (no cut: Clean cut is off)');
    expect(levelNote(all(5))).toBeNull();
    expect(levelNote(all(1))).toBeNull();
    expect(levelNote({ level: 3, allowed: ['cube'], joins: [] })).toBeNull();
    const noTilt: JoinKind[] = JOINS.filter((j) => j !== 'hinged' && j !== 'tilt45');
    expect(levelNote({ level: 6, allowed: PRIMITIVES, joins: noTilt })).toBe(
      'Level 6 (no tilted piece: Hinged lid and 45° piece are off)',
    );
    expect(levelNote({ level: 6, allowed: PRIMITIVES, joins: ['stack', 'tilt45'] })).toBeNull();
  });
});
