import type { Level } from '../../geometry/clean/generate-clean';
import { JOINS, PRIMITIVES } from '../../geometry/types';
import type { FormStyle } from '../../geometry/types';
import type { RenderMode, RenderOptions } from '../../render/render-options';
import type { Lens } from '../../views/camera';
import type { ShotPlan } from '../../views/patterns';
import type { View } from '../../views/types';
import { EXERCISE_IDS } from './exercises';
import type { ExerciseId } from './exercises';
import { defaultSettings } from './state';
import type { Settings } from './state';

export const SETTINGS_KEY = 'turnaround.settings.v1';

/*
 * The last-used settings, per device, in localStorage as JSON. Loading checks every field: a field that is
 * missing or wrong takes its default (Box basics), and a repaired set no longer counts as its exercise.
 */

type Raw = Record<string, unknown>;

const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Collects values from stored data, noting whether anything had to be repaired. */
class Reader {
  repaired = false;

  obj(v: unknown): Raw {
    if (isObject(v)) return v;
    this.repaired = true;
    return {};
  }

  oneOf<T>(v: unknown, options: readonly T[], fallback: T): T {
    if (options.includes(v as T)) return v as T;
    this.repaired = true;
    return fallback;
  }

  bool(v: unknown, fallback: boolean): boolean {
    return this.oneOf(v, [true, false], fallback);
  }

  num(v: unknown, fallback: number): number {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    this.repaired = true;
    return fallback;
  }

  /** Known values only, deduplicated and in `order`; `fallback` when not an array or (if `nonEmpty`) empty. */
  list<T>(v: unknown, order: readonly T[], fallback: T[], nonEmpty: boolean): T[] {
    if (!Array.isArray(v)) {
      this.repaired = true;
      return fallback;
    }
    const known = order.filter((t) => v.includes(t));
    if (known.length !== v.length) this.repaired = true;
    if (nonEmpty && known.length === 0) {
      this.repaired = true;
      return fallback;
    }
    return known;
  }
}

const LEVELS: Level[] = [1, 2, 3, 4, 5, 6];
const STYLES: FormStyle[] = ['clean', 'freeform'];
const LENSES: Lens[] = ['flat', 'normal', 'wide'];
const MODES: RenderMode[] = ['shaded', 'lines', 'silhouette'];

function readView(r: Reader, v: unknown, d: View): View {
  const o = r.obj(v);
  return { turn: r.num(o.turn, d.turn), tilt: r.num(o.tilt, d.tilt) };
}

function readPlan(r: Reader, v: unknown, d: ShotPlan): ShotPlan {
  const o = r.obj(v);
  const turntable = r.obj(o.turntable);
  const grid = r.obj(o.grid);
  const sequence = r.obj(o.sequence);
  const allAround = r.obj(o.allAround);
  return {
    pattern: r.oneOf(o.pattern, ['turntable', 'grid', 'sequence', 'allAround', 'orthographic'] as const, d.pattern),
    turntable: {
      step: r.oneOf(turntable.step, [90, 45, 30] as const, d.turntable.step),
      tilt: r.oneOf(turntable.tilt, ['above', 'level', 'below'] as const, d.turntable.tilt),
    },
    grid: { size: r.oneOf(grid.size, ['4x3', '6x3', '8x5'] as const, d.grid.size) },
    sequence: {
      axis: r.oneOf(sequence.axis, ['vertical', 'sideways'] as const, d.sequence.axis),
      steps: r.oneOf(sequence.steps, ['4x15', '6x15', '4x30'] as const, d.sequence.steps),
      start: readView(r, sequence.start, d.sequence.start),
    },
    allAround: { count: r.oneOf(allAround.count, [6, 8, 12, 24] as const, d.allAround.count) },
    topMap: r.bool(o.topMap, d.topMap),
  };
}

function readRender(r: Reader, v: unknown, d: RenderOptions): RenderOptions {
  const o = r.obj(v);
  return {
    lens: r.oneOf(o.lens, LENSES, d.lens),
    hidden: r.bool(o.hidden, d.hidden),
    box: r.bool(o.box, d.box),
    centreLines: r.bool(o.centreLines, d.centreLines),
    ground: r.bool(o.ground, d.ground),
    mode: r.oneOf(o.mode, MODES, d.mode),
  };
}

/** Field by field over the defaults; JSON.stringify gives a stable comparison since field order is fixed. */
function readSettings(raw: unknown): Settings {
  const d = defaultSettings();
  const r = new Reader();
  const o = r.obj(raw);
  const stored = o.exercise === null ? null : EXERCISE_IDS.includes(o.exercise as ExerciseId) ? (o.exercise as ExerciseId) : undefined;
  const s: Settings = {
    exercise: stored ?? null,
    style: r.oneOf(o.style, STYLES, d.style),
    level: r.oneOf(o.level, LEVELS, d.level),
    allowed: r.list(o.allowed, PRIMITIVES, d.allowed, true),
    joins: r.list(o.joins, JOINS, d.joins, false),
    pieces: d.pieces,
    plan: readPlan(r, o.plan, d.plan),
    hideOne: r.bool(o.hideOne, d.hideOne),
    render: readRender(r, o.render, d.render),
  };
  if (stored === undefined || r.repaired) {
    // a repaired set that came out as exactly the defaults is still Box basics
    const same = JSON.stringify({ ...s, exercise: d.exercise }) === JSON.stringify(d);
    s.exercise = same ? d.exercise : null;
  }
  return s;
}

export function loadSettings(): Settings {
  try {
    const text = localStorage.getItem(SETTINGS_KEY);
    return readSettings(text === null ? undefined : JSON.parse(text));
  } catch {
    return defaultSettings();
  }
}

/** Never throws: storage may be full, blocked or missing. */
export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // keep going with the settings in memory
  }
}
