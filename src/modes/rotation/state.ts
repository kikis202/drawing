import type { Level } from '../../geometry/clean/generate-clean';
import { JOINS, PRIMITIVES } from '../../geometry/types';
import type { FormMesh, FormSpec, FormStyle, JoinKind, PrimitiveType } from '../../geometry/types';
import { DEFAULT_RENDER } from '../../render/render-options';
import type { RenderOptions } from '../../render/render-options';
import { DEFAULT_PLAN, planShots } from '../../views/patterns';
import type { ShotPlan } from '../../views/patterns';
import type { Shot, View } from '../../views/types';
import { exercise } from './exercises';
import type { ExerciseId } from './exercises';

export interface Settings {
  /** null = customised. */
  exercise: ExerciseId | null;
  style: FormStyle;
  level: Level;
  allowed: PrimitiveType[];
  joins: JoinKind[];
  /** Freeform only, fixed at 3 (no UI). */
  pieces: number;
  plan: ShotPlan;
  hideOne: boolean;
  render: RenderOptions;
}

export interface RotationState {
  settings: Settings;
  form: { spec: FormSpec; mesh: FormMesh; version: number } | null;
  generated: Shot[];
  custom: Shot[];
  /** Shot ids ticked to keep. */
  kept: string[];
  live: View;
  activeShotId: string | null;
  nextCustomId: number;
  /** The generated shot covered for "Hide one shot to test me". */
  hiddenShotId: string | null;
  revealed: boolean;
}

/** A plan that shares no objects with `plan` (DEFAULT_PLAN is mutable and exported). */
export function copyPlan(plan: ShotPlan): ShotPlan {
  return {
    pattern: plan.pattern,
    turntable: { ...plan.turntable },
    grid: { ...plan.grid },
    sequence: { ...plan.sequence, start: { ...plan.sequence.start } },
    allAround: { ...plan.allAround },
    topMap: plan.topMap,
  };
}

/** `plan` with `patch` laid over it, sharing no objects with either. */
function patchPlan(plan: ShotPlan, patch: Partial<ShotPlan>): ShotPlan {
  return copyPlan({ ...plan, ...patch });
}

/** `base`'s settings with an exercise's applied; topMap and hideOne are not part of an exercise. */
function exerciseSettings(base: Settings, id: ExerciseId): Settings {
  const { style, level, allowed, joins, plan, render } = exercise(id).apply;
  return {
    ...base,
    exercise: id,
    style,
    level,
    allowed: [...allowed],
    joins: [...joins],
    plan: patchPlan(base.plan, plan),
    render: { ...base.render, ...render },
  };
}

const BLANK: Settings = {
  exercise: null,
  style: 'clean',
  level: 1,
  allowed: [...PRIMITIVES],
  joins: [],
  pieces: 3,
  plan: DEFAULT_PLAN,
  hideOne: false,
  render: DEFAULT_RENDER,
};

/** Box basics; a fresh copy on every call. */
export function defaultSettings(): Settings {
  return exerciseSettings(BLANK, 'boxBasics');
}

export const initialState: RotationState = {
  settings: defaultSettings(),
  form: null,
  generated: [],
  custom: [],
  kept: [],
  live: { turn: 30, tilt: 20 },
  activeShotId: null,
  nextCustomId: 0,
  hiddenShotId: null,
  revealed: false,
};

function generate(plan: ShotPlan): Shot[] {
  return planShots(plan).map((p, i) => ({
    id: `g${i}`,
    view: p.view,
    source: 'generated' as const,
    ...(p.role ? { role: p.role } : {}),
  }));
}

/** One of the pattern's own shots (never the map), at index floor(rand × count); null when hideOne is off. */
function pickHidden(settings: Settings, generated: Shot[], rand: number): string | null {
  if (!settings.hideOne) return null;
  const candidates = generated.filter((g) => g.role !== 'map');
  if (candidates.length === 0) return null;
  return candidates[Math.min(candidates.length - 1, Math.floor(rand * candidates.length))].id;
}

const sameView = (a: View, b: View) => a.turn === b.turn && a.tilt === b.tilt;

function customised(s: RotationState, patch: Partial<Settings>): RotationState {
  return { ...s, settings: { ...s.settings, ...patch, exercise: null } };
}

export function setForm(s: RotationState, spec: FormSpec, mesh: FormMesh, rand: number): RotationState {
  const generated = generate(s.settings.plan);
  return {
    ...s,
    form: { spec, mesh, version: (s.form?.version ?? 0) + 1 },
    generated,
    custom: [],
    kept: [],
    activeShotId: null,
    hiddenShotId: pickHidden(s.settings, generated, rand),
    revealed: false,
  };
}

/** Settings only; the store then generates a new object. */
export function applyExercise(s: RotationState, id: ExerciseId): RotationState {
  return { ...s, settings: exerciseSettings(s.settings, id) };
}

/**
 * Regenerates the shots. A ticked generated shot whose view is still in the set stays ticked under its new id;
 * one whose view isn't becomes a custom shot, unless a custom shot with that view already exists.
 * Choosing Sequence captures its start from the live view.
 */
export function setPlan(s: RotationState, patch: Partial<ShotPlan>, rand: number): RotationState {
  let plan = patchPlan(s.settings.plan, patch);
  if (patch.pattern === 'sequence') plan = patchPlan(plan, { sequence: { ...plan.sequence, start: { ...s.live } } });
  const settings: Settings = { ...s.settings, plan, exercise: null };
  const generated = generate(plan);

  let nextCustomId = s.nextCustomId;
  const custom = [...s.custom];
  const idMap = new Map<string, string>();
  for (const g of s.generated) {
    const still = generated.find((n) => sameView(n.view, g.view));
    if (still) {
      idMap.set(g.id, still.id);
      continue;
    }
    if (!s.kept.includes(g.id)) continue;
    let existing = custom.find((c) => sameView(c.view, g.view));
    if (!existing) {
      existing = { id: `c${nextCustomId++}`, view: g.view, source: 'custom' };
      custom.push(existing);
    }
    idMap.set(g.id, existing.id);
  }
  const kept: string[] = [];
  for (const id of s.kept) {
    const mapped = id.startsWith('g') ? idMap.get(id) : id;
    if (mapped !== undefined && !kept.includes(mapped)) kept.push(mapped);
  }
  const activeShotId = s.activeShotId?.startsWith('g') ? (idMap.get(s.activeShotId) ?? null) : s.activeShotId;

  return {
    ...s,
    settings,
    generated,
    custom,
    kept,
    activeShotId,
    nextCustomId,
    hiddenShotId: pickHidden(settings, generated, rand),
    revealed: false,
  };
}

/** "Start from live view": the sequence restarts at the current live view. */
export function startFromLive(s: RotationState, rand: number): RotationState {
  return setPlan(s, { sequence: { ...s.settings.plan.sequence, start: { ...s.live } } }, rand);
}

export function setStyle(s: RotationState, style: FormStyle): RotationState {
  return customised(s, { style });
}

export function setLevel(s: RotationState, level: Level): RotationState {
  return customised(s, { level });
}

export function toggleJoin(s: RotationState, join: JoinKind): RotationState {
  const { joins } = s.settings;
  const next = joins.includes(join) ? joins.filter((j) => j !== join) : JOINS.filter((j) => j === join || joins.includes(j));
  return customised(s, { joins: next });
}

/** Keeps at least one shape allowed. */
export function toggleAllowed(s: RotationState, type: PrimitiveType): RotationState {
  const { allowed } = s.settings;
  if (allowed.includes(type)) {
    if (allowed.length === 1) return s;
    return customised(s, { allowed: allowed.filter((t) => t !== type) });
  }
  return customised(s, { allowed: PRIMITIVES.filter((t) => t === type || allowed.includes(t)) });
}

/** Lines only and Silhouette are one `mode`, so turning one on turns the other off. */
export function setRender(s: RotationState, patch: Partial<RenderOptions>): RotationState {
  return customised(s, { render: { ...s.settings.render, ...patch } });
}

export function setHideOne(s: RotationState, on: boolean, rand: number): RotationState {
  const next = customised(s, { hideOne: on });
  return { ...next, hiddenShotId: pickHidden(next.settings, next.generated, rand), revealed: false };
}

export function reveal(s: RotationState): RotationState {
  return { ...s, revealed: true };
}

export function toggleKeep(s: RotationState, id: string): RotationState {
  return { ...s, kept: s.kept.includes(id) ? s.kept.filter((k) => k !== id) : [...s.kept, id] };
}

export function captureView(s: RotationState): RotationState {
  const id = `c${s.nextCustomId}`;
  return {
    ...s,
    custom: [...s.custom, { id, view: { ...s.live }, source: 'custom' }],
    kept: [...s.kept, id],
    activeShotId: id,
    nextCustomId: s.nextCustomId + 1,
  };
}

export function setLive(s: RotationState, view: View, activeShotId: string | null): RotationState {
  return { ...s, live: view, activeShotId };
}

export function allShots(s: RotationState): Shot[] {
  return [...s.generated, ...s.custom];
}

export function keptShots(s: RotationState): Shot[] {
  return allShots(s).filter((shot) => s.kept.includes(shot.id));
}
