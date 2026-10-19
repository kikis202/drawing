import { describe, expect, it } from 'vitest';
import { EXERCISES } from '../../../src/modes/rotation/exercises';
import type { ExerciseId } from '../../../src/modes/rotation/exercises';
import {
  allShots,
  applyExercise,
  captureView,
  initialState,
  keptShots,
  reveal,
  setForm,
  setHideOne,
  setLevel,
  setLive,
  setPlan,
  setRender,
  setStyle,
  startFromLive,
  toggleAllowed,
  toggleJoin,
  toggleKeep,
} from '../../../src/modes/rotation/state';
import type { RotationState } from '../../../src/modes/rotation/state';
import { DEFAULT_RENDER } from '../../../src/render/render-options';
import { DEFAULT_PLAN, planShots } from '../../../src/views/patterns';
import type { FormMesh, FormSpec } from '../../../src/geometry/types';

const spec: FormSpec = {
  version: 2,
  style: 'freeform',
  seed: 0,
  pieces: [{ type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
};
const mesh: FormMesh = { positions: new Float32Array(9), indices: new Uint32Array(3), volume: 1, bounds: { min: [0, 0, 0], max: [0, 0, 0] }, axes: new Float32Array(0), creaseDeg: 30 };

const withForm = (s: RotationState = initialState, rand = 0) => setForm(s, spec, mesh, rand);
const view = (turn: number, tilt: number) => ({ turn, tilt });
const keptViews = (s: RotationState) =>
  keptShots(s)
    .map((x) => `${x.view.turn}/${x.view.tilt}`)
    .sort();

/** The spec's "Exercises (presets)" table. Carved blocks shapes are boxes (cylinders only as cutters). */
const TABLE: Record<ExerciseId, {
  name: string;
  blurb: string;
  style: 'clean' | 'freeform';
  level?: number;
  allowed: string[];
  joins?: string[];
  plan: Record<string, unknown>;
  hidden: boolean;
  centreLines: boolean;
}> = {
  boxBasics: {
    name: 'Box basics', blurb: 'One box, quarter turns', style: 'clean', level: 1, allowed: ['cube'], joins: [],
    plan: { pattern: 'turntable', turntable: { step: 90, tilt: 'level' } }, hidden: true, centreLines: false,
  },
  stacks: {
    name: 'Stacks and totems', blurb: 'Clean stacks on one axis', style: 'clean', level: 3,
    allowed: ['cube', 'cylinder', 'cone', 'pyramid'], joins: ['stack', 'totem'],
    plan: { pattern: 'turntable', turntable: { step: 45, tilt: 'above' } }, hidden: false, centreLines: true,
  },
  chests: {
    name: 'Chests and lids', blurb: 'Half-sunk cylinders, hinges', style: 'clean', level: 6,
    allowed: ['cube', 'cylinder'], joins: ['stack', 'halfSunk', 'hinged'],
    plan: { pattern: 'turntable', turntable: { step: 45, tilt: 'above' } }, hidden: true, centreLines: false,
  },
  intersections: {
    name: 'Intersections', blurb: 'Pieces passing through', style: 'clean', level: 4,
    allowed: ['cube', 'cylinder', 'cone', 'pyramid'], joins: ['wing', 'through', 'mirror'],
    plan: { pattern: 'grid', grid: { size: '6x3' } }, hidden: true, centreLines: false,
  },
  carved: {
    name: 'Carved blocks', blurb: 'One block, clean cuts', style: 'clean', level: 5, allowed: ['cube'], joins: ['cut'],
    plan: { pattern: 'turntable', turntable: { step: 45, tilt: 'above' } }, hidden: true, centreLines: false,
  },
  freeform: {
    name: 'Freeform', blurb: 'Anything goes', style: 'freeform',
    allowed: ['cube', 'sphere', 'cylinder', 'cone', 'pyramid'],
    plan: { pattern: 'allAround', allAround: { count: 8 } }, hidden: false, centreLines: false,
  },
};

describe('rotation state', () => {
  it('initial settings are Box basics', () => {
    expect(initialState.settings).toEqual({
      exercise: 'boxBasics',
      style: 'clean',
      level: 1,
      allowed: ['cube'],
      joins: [],
      pieces: 3,
      plan: { ...DEFAULT_PLAN, turntable: { step: 90, tilt: 'level' } },
      hideOne: false,
      render: { ...DEFAULT_RENDER, hidden: true },
    });
    expect(initialState.settings.plan).not.toBe(DEFAULT_PLAN);
    expect(initialState.settings.plan.sequence.start).not.toBe(DEFAULT_PLAN.sequence.start);
    expect(initialState.live).toEqual({ turn: 30, tilt: 20 });
    expect(initialState.form).toBeNull();
    expect(initialState.hiddenShotId).toBeNull();
    expect(initialState.revealed).toBe(false);
  });

  it('applyExercise sets the spec values for each exercise', () => {
    expect(EXERCISES.map((e) => e.id)).toEqual(['boxBasics', 'stacks', 'chests', 'intersections', 'carved', 'freeform']);
    // start from something customised so every value has to be applied
    let base = setRender(setPlan(initialState, { pattern: 'orthographic', topMap: true }, 0), { lens: 'wide', box: true, ground: true, mode: 'lines' });
    base = setHideOne(base, true, 0);
    for (const ex of EXERCISES) {
      const row = TABLE[ex.id];
      expect([ex.name, ex.blurb]).toEqual([row.name, row.blurb]);
      const s = applyExercise(base, ex.id).settings;
      expect(s.exercise).toBe(ex.id);
      expect(s.style).toBe(row.style);
      if (row.level !== undefined) expect(s.level).toBe(row.level);
      if (row.joins !== undefined) expect(s.joins).toEqual(row.joins);
      expect(s.allowed).toEqual(row.allowed);
      expect(s.plan).toMatchObject(row.plan);
      // the checkboxes in Customise are not part of an exercise
      expect(s.plan.topMap).toBe(true);
      expect(s.hideOne).toBe(true);
      expect(s.render).toEqual({ ...DEFAULT_RENDER, hidden: row.hidden, centreLines: row.centreLines });
      expect(s.plan).not.toBe(base.settings.plan);
      expect(s.plan.sequence).not.toBe(base.settings.plan.sequence);
    }
  });

  it('changing anything else marks the settings customised', () => {
    const s = applyExercise(initialState, 'stacks');
    const changes: RotationState[] = [
      setPlan(s, { pattern: 'grid' }, 0),
      setStyle(s, 'freeform'),
      setLevel(s, 4),
      toggleJoin(s, 'wing'),
      toggleAllowed(s, 'sphere'),
      setRender(s, { box: true }),
      setHideOne(s, true, 0),
      startFromLive(s, 0),
    ];
    for (const c of changes) expect(c.settings.exercise).toBeNull();
    expect(applyExercise(changes[0], 'stacks').settings.exercise).toBe('stacks');
    // ticks, captures and drags are not settings
    let t = withForm(s);
    t = captureView(toggleKeep(setLive(t, view(10, 10), null), 'g0'));
    expect(t.settings.exercise).toBe('stacks');
  });

  it('toggleJoin toggles in join order; toggleAllowed keeps at least one shape', () => {
    let s = toggleJoin(initialState, 'wing');
    s = toggleJoin(s, 'stack');
    expect(s.settings.joins).toEqual(['stack', 'wing']);
    expect(toggleJoin(s, 'stack').settings.joins).toEqual(['wing']);
    expect(initialState.settings.allowed).toEqual(['cube']);
    expect(toggleAllowed(initialState, 'cube')).toBe(initialState);
    expect(toggleAllowed(initialState, 'cone').settings.allowed).toEqual(['cube', 'cone']);
  });

  it('setForm makes the plan shots, clears custom shots and ticks and bumps the version', () => {
    let s = withForm(setPlan(initialState, { topMap: true }, 0));
    expect(s.form?.version).toBe(1);
    const planned = planShots(s.settings.plan);
    expect(s.generated).toEqual(
      planned.map((p, i) => ({ id: `g${i}`, view: p.view, source: 'generated', ...(p.role ? { role: p.role } : {}) })),
    );
    expect(s.generated[0].role).toBe('map');
    s = captureView(toggleKeep(s, 'g1'));
    const t = withForm(s);
    expect(t.form?.version).toBe(2);
    expect(t.custom).toEqual([]);
    expect(t.kept).toEqual([]);
    expect(t.activeShotId).toBeNull();
    expect(t.nextCustomId).toBe(s.nextCustomId);
    expect(t.live).toEqual(s.live);
    expect(t.settings).toBe(s.settings);
  });

  it('setPlan keeps ticks by view and never duplicates', () => {
    // turntable 90° at eye level: 30, 120, 210, 300; grid 6 × 3 at 0°: 30, 90, 150, 210, 270, 330
    let s = withForm();
    s = toggleKeep(toggleKeep(s, 'g0'), 'g1');
    s = setLive(s, view(120, 0), 'g1');
    const ticked = keptViews(s);
    expect(ticked).toEqual(['120/0', '30/0']);

    s = setPlan(s, { pattern: 'grid' }, 0);
    expect(keptViews(s)).toEqual(ticked);
    expect(s.custom).toEqual([{ id: 'c0', view: view(120, 0), source: 'custom' }]);
    const stay = s.generated.find((g) => g.view.turn === 30 && g.view.tilt === 0)!;
    expect(s.kept).toContain(stay.id);
    expect(s.activeShotId).toBe('c0');

    s = setPlan(s, { pattern: 'turntable' }, 0);
    expect(keptViews(s)).toEqual(ticked);
    expect(s.custom).toHaveLength(1);
    expect(s.kept).toEqual(['g0', 'c0']);

    // a ticked generated shot whose view a custom shot already has is not added again
    s = toggleKeep(s, 'g1'); // 120/0 again, now as a generated shot
    s = setPlan(s, { pattern: 'grid' }, 0);
    expect(s.custom).toHaveLength(1);
    expect(keptViews(s)).toEqual(ticked);
    expect(new Set(s.kept).size).toBe(s.kept.length);
    s = setPlan(s, { pattern: 'turntable' }, 0);
    expect(keptViews(s)).toEqual(ticked);
    expect(s.custom).toHaveLength(1);
  });

  it('setPlan drops an active generated shot that leaves the set unticked', () => {
    let s = setLive(withForm(), view(120, 0), 'g1');
    expect(setPlan(s, { pattern: 'grid' }, 0).activeShotId).toBeNull();
    s = setLive(s, view(210, 0), 'g2');
    const t = setPlan(s, { pattern: 'grid' }, 0);
    expect(t.generated.find((g) => g.id === t.activeShotId)?.view).toEqual(view(210, 0));
  });

  it('hidden shot is always a current pattern shot', () => {
    const check = (s: RotationState) => {
      if (!s.settings.hideOne) {
        expect(s.hiddenShotId).toBeNull();
        return;
      }
      const shot = s.generated.find((g) => g.id === s.hiddenShotId);
      expect(shot).toBeDefined();
      expect(shot?.role).toBeUndefined();
      expect(s.revealed).toBe(false);
    };
    let s = withForm(setPlan(initialState, { topMap: true }, 0));
    check(s);
    expect(s.hiddenShotId).toBeNull();
    s = setHideOne(s, true, 0);
    check(s);
    expect(s.hiddenShotId).toBe('g1'); // g0 is the map
    s = reveal(s);
    expect(s.revealed).toBe(true);
    for (const rand of [0, 0.3, 0.5, 0.999]) {
      s = withForm(reveal(s), rand);
      check(s);
      s = setPlan(s, { pattern: 'grid', grid: { size: '8x5' } }, rand);
      check(s);
      s = setPlan(s, { pattern: 'orthographic' }, rand); // has a top view, so no map
      check(s);
      s = setPlan(s, { pattern: 'allAround', allAround: { count: 24 } }, rand);
      check(s);
    }
    s = setPlan(s, { pattern: 'turntable' }, 0.999);
    expect(s.hiddenShotId).toBe('g4');
    s = setHideOne(s, false, 0.5);
    check(s);
    s = withForm(s, 0.5);
    check(s);
    s = setHideOne(reveal(s), true, 0.5);
    check(s);
    expect(s.hiddenShotId).toBe('g3');
    // captureView doesn't change it
    expect(captureView(s).hiddenShotId).toBe('g3');
  });

  it('lines and silhouette are exclusive', () => {
    let s = setRender(initialState, { mode: 'lines' });
    expect(s.settings.render.mode).toBe('lines');
    s = setRender(s, { mode: 'silhouette' });
    expect(s.settings.render.mode).toBe('silhouette');
    s = setRender(s, { mode: 'lines' });
    expect(s.settings.render.mode).toBe('lines');
    expect(setRender(s, { mode: 'shaded' }).settings.render.mode).toBe('shaded');
    expect(setRender(initialState, { lens: 'wide' }).settings.render).toEqual({ ...initialState.settings.render, lens: 'wide' });
  });

  it('sequence start comes from the live view', () => {
    let s = withForm(setLive(initialState, view(75, -20), null));
    s = setPlan(s, { pattern: 'sequence' }, 0);
    expect(s.settings.plan.sequence.start).toEqual(view(75, -20));
    expect(s.settings.plan.sequence.start).not.toBe(s.live);
    expect(s.generated.map((g) => g.view)).toEqual(planShots(s.settings.plan).map((p) => p.view));
    expect(s.generated[0].view).toEqual(view(75, -20));
    // later drags don't move it
    s = setLive(s, view(200, 10), null);
    expect(s.settings.plan.sequence.start).toEqual(view(75, -20));
    s = setPlan(s, { sequence: { ...s.settings.plan.sequence, axis: 'sideways' } }, 0);
    expect(s.settings.plan.sequence.start).toEqual(view(75, -20));
    s = startFromLive(s, 0);
    expect(s.settings.plan.sequence.start).toEqual(view(200, 10));
    expect(s.generated[0].view.turn).toBe(200);
    expect(DEFAULT_PLAN.sequence.start).toEqual(view(30, 20));
  });

  it('captureView adds a kept, active custom shot at the live view', () => {
    let s = withForm();
    s = setLive(s, { turn: 100, tilt: -10 }, null);
    s = captureView(s);
    expect(s.custom).toEqual([{ id: 'c0', view: { turn: 100, tilt: -10 }, source: 'custom' }]);
    expect(s.kept).toEqual(['c0']);
    expect(s.activeShotId).toBe('c0');
    expect(captureView(s).custom[1].id).toBe('c1');
  });

  it('toggleKeep ticks and unticks; keptShots is generated then custom', () => {
    let s = withForm();
    s = captureView(s);
    s = toggleKeep(toggleKeep(s, 'g3'), 'g2');
    expect(keptShots(s).map((x) => x.id)).toEqual(['g2', 'g3', 'c0']);
    s = toggleKeep(s, 'g2');
    expect(s.kept).not.toContain('g2');
    expect(allShots(s)).toHaveLength(5);
  });
});
