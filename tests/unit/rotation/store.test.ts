import { effect } from '@preact/signals';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRotationStore } from '../../../src/modes/rotation/store';
import { applyExercise, initialState, setHideOne, setLevel, setStyle, toggleKeep } from '../../../src/modes/rotation/state';
import { saveSettings, SETTINGS_KEY } from '../../../src/modes/rotation/settings-storage';
import type { RotationState } from '../../../src/modes/rotation/state';
import type { ManifoldToplevel } from '../../../src/geometry/manifold';
import type { FormSpec } from '../../../src/geometry/types';
import { planShots } from '../../../src/views/patterns';
import { getTestManifold } from '../../helpers/manifold';

let wasm: ManifoldToplevel;
beforeAll(async () => {
  wasm = await getTestManifold();
});

let data: Map<string, string>;
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

const cube: FormSpec = {
  version: 2,
  style: 'freeform',
  seed: 0,
  pieces: [{ type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
};

const savedBase = { id: 's', createdAt: 1, form: cube, settings: applyExercise(initialState, 'carved').settings, hidden: false };

describe('rotation store', () => {
  it('store.newObject uses the clean generator for clean style', () => {
    const store = createRotationStore(wasm);
    expect(store.state.value.form).toBeNull();
    expect(store.state.value.settings).toEqual(initialState.settings);
    store.newObject();
    let s = store.state.value;
    expect(s.form?.version).toBe(1);
    expect(s.form?.spec.style).toBe('clean');
    expect(s.form?.spec.pieces).toHaveLength(1); // Box basics: Level 1
    expect(s.form?.spec.pieces[0].type).toBe('cube');
    expect(s.form?.spec.recipe).toBeDefined();
    expect(s.generated).toHaveLength(4); // turntable, 90°

    store.dispatch(setStyle, 'freeform');
    store.newObject();
    s = store.state.value;
    expect(s.form?.version).toBe(2);
    expect(s.form?.spec.style).toBe('freeform');
    expect(s.form?.spec.recipe).toBeUndefined();
  });

  it('applyExercise applies the settings and generates', () => {
    const store = createRotationStore(wasm);
    store.dispatch(setHideOne, true, 0);
    store.applyExercise('intersections');
    const s = store.state.value;
    expect(s.settings.exercise).toBe('intersections');
    expect(s.form?.spec.style).toBe('clean');
    expect(s.generated).toHaveLength(18);
    expect(s.generated.some((g) => g.id === s.hiddenShotId)).toBe(true);
  });

  it('applyExercise commits its settings and the new object together', () => {
    const store = createRotationStore(wasm);
    store.newObject();
    const seen: RotationState[] = [];
    const stop = effect(() => void seen.push(store.state.value));
    store.applyExercise('stacks');
    stop();
    // the effect's first run, then exactly one change: never new settings with the old shots
    expect(seen).toHaveLength(2);
    expect(seen[1].settings.exercise).toBe('stacks');
    expect(seen[1].form?.version).toBe(2);
  });

  it('store.variation keeps the recipe', () => {
    const store = createRotationStore(wasm);
    store.dispatch(setLevel, 3);
    let varied = 0;
    // a random seed can rarely have no other proportions in budget; that case is the no-op test below
    for (let i = 0; i < 5 && varied === 0; i++) {
      store.newObject();
      const before = store.state.value.form!;
      store.variation();
      const after = store.state.value.form!;
      if (after === before) continue;
      varied++;
      expect(after.version).toBe(before.version + 1);
      expect(after.spec.recipe).toEqual(before.spec.recipe);
      expect(after.spec.seed).toBe(before.spec.seed);
      expect(after.spec.variation).toBeGreaterThan(before.spec.variation ?? 0);
    }
    expect(varied).toBe(1);
  });

  it('variation is a no-op for Freeform', () => {
    const store = createRotationStore(wasm);
    store.applyExercise('freeform');
    const before = store.state.value;
    store.variation();
    expect(store.state.value).toBe(before);
  });

  it('variation that finds nothing new changes nothing', async () => {
    vi.resetModules();
    vi.doMock('../../../src/geometry/clean/generate-clean', async (orig) => ({
      ...(await orig<typeof import('../../../src/geometry/clean/generate-clean')>()),
      varyCleanForm: (_w: unknown, spec: FormSpec) => spec,
    }));
    const { createRotationStore: create } = await import('../../../src/modes/rotation/store');
    const { setHideOne: hide } = await import('../../../src/modes/rotation/state');
    const store = create(wasm);
    store.newObject();
    store.dispatch(hide, true, 0);
    const before = store.state.value;
    store.variation();
    expect(store.state.value).toBe(before);
    vi.doUnmock('../../../src/geometry/clean/generate-clean');
    vi.resetModules();
  });

  it('loads saved settings and saves every settings change', () => {
    saveSettings(applyExercise(initialState, 'carved').settings);
    const store = createRotationStore(wasm);
    expect(store.state.value.settings.exercise).toBe('carved');
    store.dispatch(setLevel, 6);
    expect(JSON.parse(data.get(SETTINGS_KEY)!)).toMatchObject({ exercise: null, level: 6 });
    store.applyExercise('stacks');
    expect(JSON.parse(data.get(SETTINGS_KEY)!)).toMatchObject({ exercise: 'stacks', level: 3 });
  });

  it('openSaved loads the form with the saved views as kept custom shots', () => {
    const store = createRotationStore(wasm);
    store.dispatch(toggleKeep, 'g0');
    store.openSaved({
      ...savedBase,
      shots: [
        { view: { turn: 10, tilt: 5 }, label: 'a', image: new Blob() },
        { view: { turn: 200, tilt: -40 }, label: 'b', image: new Blob() },
      ],
    });
    const s = store.state.value;
    expect(s.form?.spec).toEqual(cube);
    expect(s.custom.map((c) => c.view)).toEqual([{ turn: 10, tilt: 5 }, { turn: 200, tilt: -40 }]);
    expect(s.kept).toEqual(s.custom.map((c) => c.id));
    expect(new Set([...s.generated, ...s.custom].map((x) => x.id)).size).toBe(s.generated.length + 2);
    expect(s.generated).toHaveLength(planShots(savedBase.settings.plan).length);
  });

  it('opening a set restores its exercise settings', () => {
    const store = createRotationStore(wasm);
    store.newObject();
    const before = store.state.value.form!.version;
    store.openSaved({ ...savedBase, shots: [{ view: { turn: 10, tilt: 5 }, label: 'a', image: new Blob() }] });
    const s = store.state.value;
    expect(s.settings).toEqual(savedBase.settings);
    expect(s.settings.exercise).toBe('carved');
    expect(s.form?.spec).toEqual(cube);
    expect(s.form!.version).toBe(before + 1);
    expect(JSON.parse(data.get(SETTINGS_KEY)!)).toMatchObject({ exercise: 'carved' });
  });

  describe('openSaved with damaged records', () => {
    const shot = { view: { turn: 10, tilt: 5 }, label: 'a', image: new Blob() };
    const open = (patch: Record<string, unknown>) => {
      const store = createRotationStore(wasm);
      store.newObject();
      const result = store.openSaved({ ...savedBase, shots: [shot], ...patch } as never);
      return { store, result };
    };

    it('repairs missing or garbage settings', () => {
      for (const settings of [undefined, { garbage: true }, 'x', null]) {
        const { store, result } = open({ settings });
        expect(result).toBe(true);
        expect(store.state.value.settings).toEqual(initialState.settings);
        expect(store.state.value.custom).toHaveLength(1);
      }
    });

    it('reports a FormSpec v1, a missing form, missing shots and bad views without changing anything', () => {
      for (const patch of [
        { form: { ...cube, version: 1 } },
        { form: undefined },
        { shots: undefined },
        { shots: [] },
        { shots: [{ view: { turn: 'a', tilt: 0 }, image: new Blob() }] },
        { shots: [{ view: { turn: 1, tilt: 0 }, image: 'no' }] },
      ]) {
        const store = createRotationStore(wasm);
        store.newObject();
        const before = store.state.value;
        expect(store.openSaved({ ...savedBase, shots: [shot], ...patch } as never)).toBe(false);
        expect(store.state.value).toBe(before);
      }
    });
  });

  it('opening a set keeps the pattern shots it saved instead of duplicating them', () => {
    const store = createRotationStore(wasm);
    store.newObject();
    const plan = planShots(savedBase.settings.plan);
    const inPattern = plan.find((p) => p.role !== 'map')!.view;
    store.openSaved({
      ...savedBase,
      shots: [
        { view: { ...inPattern }, label: 'a', image: new Blob() },
        { view: { turn: 11, tilt: 7 }, label: 'b', image: new Blob() },
      ],
    });
    const s = store.state.value;
    expect(s.custom.map((c) => c.view)).toEqual([{ turn: 11, tilt: 7 }]);
    const keptViews = s.kept.map((id) => [...s.generated, ...s.custom].find((x) => x.id === id)!.view);
    expect(keptViews).toEqual([inPattern, { turn: 11, tilt: 7 }]);
  });

  it('opening a set restores the map shot as the map', () => {
    const store = createRotationStore(wasm);
    const withMap = { ...savedBase.settings, plan: { ...savedBase.settings.plan, topMap: true } };
    store.openSaved({
      ...savedBase,
      settings: withMap,
      shots: [{ view: { turn: 0, tilt: 89 }, label: 'Top view (map)', role: 'map', image: new Blob() }],
    });
    const s = store.state.value;
    const map = s.generated.find((g) => g.role === 'map')!;
    expect(s.kept).toEqual([map.id]);
    expect(s.custom).toEqual([]);
  });

  it('a saved map with no map in the pattern stays a map shot', () => {
    const store = createRotationStore(wasm);
    store.openSaved({
      ...savedBase,
      shots: [{ view: { turn: 0, tilt: 89 }, label: 'Top view (map)', role: 'map', image: new Blob() }],
    });
    expect(store.state.value.custom[0]).toMatchObject({ role: 'map', view: { turn: 0, tilt: 89 } });
  });
});
