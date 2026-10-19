import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyExercise, initialState, setPlan, setRender } from '../../../src/modes/rotation/state';
import { loadSettings, saveSettings, SETTINGS_KEY } from '../../../src/modes/rotation/settings-storage';

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => data.get(k) ?? null,
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

const defaults = initialState.settings;
const store = (value: unknown) => localStorage.setItem(SETTINGS_KEY, typeof value === 'string' ? value : JSON.stringify(value));

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage());
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('settings storage', () => {
  it('round-trips saved settings', () => {
    const s = setRender(setPlan(applyExercise(initialState, 'intersections'), { topMap: true }, 0), { lens: 'flat' }).settings;
    saveSettings(s);
    expect(loadSettings()).toEqual(s);
    const ex = applyExercise(initialState, 'chests').settings;
    saveSettings(ex);
    expect(loadSettings()).toEqual(ex);
  });

  it('returns fresh defaults when nothing is stored', () => {
    const a = loadSettings();
    expect(a).toEqual(defaults);
    expect(a.plan).not.toBe(defaults.plan);
    expect(a.plan.sequence.start).not.toBe(defaults.plan.sequence.start);
  });

  it('loadSettings repairs bad stored data', () => {
    store('{not json');
    expect(loadSettings()).toEqual(defaults);
    for (const junk of [null, 3, 'x', [1, 2]]) {
      store(JSON.stringify(junk));
      expect(loadSettings()).toEqual(defaults);
    }

    // missing keys take the default; nothing else changed, so it is still Box basics
    store({});
    expect(loadSettings()).toEqual(defaults);

    const good = applyExercise(initialState, 'stacks').settings;
    store({ ...good, exercise: 'juggling' });
    expect(loadSettings()).toEqual({ ...good, exercise: null });

    store({ ...good, level: 9 });
    expect(loadSettings()).toEqual({ ...good, level: defaults.level, exercise: null });
    store({ ...good, level: 2.5 });
    expect(loadSettings().level).toBe(defaults.level);

    store({ ...good, allowed: [] });
    expect(loadSettings()).toEqual({ ...good, allowed: defaults.allowed, exercise: null });
    store({ ...good, allowed: ['cone', 'blob', 'cube', 'cone'] });
    expect(loadSettings().allowed).toEqual(['cube', 'cone']);
    store({ ...good, joins: ['totem', 'teleport'] });
    expect(loadSettings().joins).toEqual(['totem']);
    store({ ...good, joins: 'stack' });
    expect(loadSettings().joins).toEqual(defaults.joins);

    store({ ...good, style: 'cubist', hideOne: 'yes', pieces: 99 });
    expect(loadSettings()).toEqual({ ...good, style: defaults.style, hideOne: false, exercise: null });

    store({ ...good, render: { ...good.render, lens: 'fisheye', box: 1, mode: 'cartoon' } });
    expect(loadSettings().render).toEqual({ ...good.render, lens: 'normal', box: false, mode: 'shaded' });
    store({ ...good, render: 'pretty' });
    expect(loadSettings().render).toEqual(defaults.render);
  });

  it('repairs every part of the shot plan', () => {
    const good = applyExercise(initialState, 'intersections').settings;
    const bad = {
      pattern: 'spiral',
      turntable: { step: 60, tilt: 'level' },
      grid: { size: '9x9' },
      sequence: { axis: 'diagonal', steps: '5x15', start: { turn: 'a', tilt: Infinity } },
      allAround: { count: 7 },
      topMap: 'on',
    };
    store({ ...good, plan: bad });
    const plan = loadSettings().plan;
    expect(plan).toEqual({ ...defaults.plan, turntable: { step: 90, tilt: 'level' } });
    store({ ...good, plan: { ...good.plan, turntable: { step: 45, tilt: 'sideways' }, sequence: { ...good.plan.sequence, start: { turn: 100, tilt: 'up' } } } });
    expect(loadSettings().plan.turntable).toEqual({ step: 45, tilt: defaults.plan.turntable.tilt });
    expect(loadSettings().plan.sequence.start).toEqual({ turn: 100, tilt: defaults.plan.sequence.start.tilt });
    store({ ...good, plan: null });
    expect(loadSettings().plan).toEqual(defaults.plan);
    store({ ...good, plan: { ...good.plan, sequence: { axis: 'sideways', steps: '4x30', start: { turn: 10, tilt: -20 } }, allAround: { count: 24 }, topMap: true } });
    expect(loadSettings()).toEqual({
      ...good,
      plan: { ...good.plan, sequence: { axis: 'sideways', steps: '4x30', start: { turn: 10, tilt: -20 } }, allAround: { count: 24 }, topMap: true },
    });
  });

  it('never throws when storage fails', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(() => saveSettings(defaults)).not.toThrow();
    expect(loadSettings()).toEqual(defaults);
    vi.stubGlobal('localStorage', undefined);
    expect(() => saveSettings(defaults)).not.toThrow();
    expect(loadSettings()).toEqual(defaults);
  });
});
