import { PRIMITIVES } from '../../geometry/types';
import type { FormMesh, FormSpec, PrimitiveType } from '../../geometry/types';
import { DEFAULT_RENDER } from '../../render/render-options';
import type { RenderOptions } from '../../render/render-options';
import { ringViews } from '../../views/spacing';
import type { Shot, View } from '../../views/types';

export interface Settings {
  allowed: PrimitiveType[];
  pieces: number;
  shotCount: number;
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
}

export const initialState: RotationState = {
  settings: { allowed: [...PRIMITIVES], pieces: 3, shotCount: 8, render: DEFAULT_RENDER },
  form: null,
  generated: [],
  custom: [],
  kept: [],
  live: { turn: 30, tilt: 20 },
  activeShotId: null,
  nextCustomId: 0,
};

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(n)));

function generate(count: number): Shot[] {
  return ringViews(count).map((view, i) => ({ id: `g${i}`, view, source: 'generated' as const }));
}

export function setForm(s: RotationState, spec: FormSpec, mesh: FormMesh): RotationState {
  return {
    ...s,
    form: { spec, mesh, version: (s.form?.version ?? 0) + 1 },
    generated: generate(s.settings.shotCount),
    custom: [],
    kept: [],
    activeShotId: null,
  };
}

/** Ticked generated shots survive the regeneration as custom shots. */
export function setShotCount(s: RotationState, n: number): RotationState {
  const shotCount = clamp(n, 2, 36);
  if (shotCount === s.settings.shotCount) return s;

  let nextCustomId = s.nextCustomId;
  const converted: Shot[] = [];
  const idMap = new Map<string, string>();
  for (const g of s.generated) {
    if (!s.kept.includes(g.id)) continue;
    const id = `c${nextCustomId++}`;
    idMap.set(g.id, id);
    converted.push({ id, view: g.view, source: 'custom' });
  }
  const kept = s.kept.map((id) => idMap.get(id) ?? id);
  const activeShotId =
    s.activeShotId === null
      ? null
      : s.activeShotId.startsWith('g')
        ? (idMap.get(s.activeShotId) ?? null)
        : s.activeShotId;

  return {
    ...s,
    settings: { ...s.settings, shotCount },
    generated: generate(shotCount),
    custom: [...s.custom, ...converted],
    kept,
    activeShotId,
    nextCustomId,
  };
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

/** Keeps at least one shape allowed. */
export function toggleAllowed(s: RotationState, type: PrimitiveType): RotationState {
  const { allowed } = s.settings;
  if (allowed.includes(type)) {
    if (allowed.length === 1) return s;
    return { ...s, settings: { ...s.settings, allowed: allowed.filter((t) => t !== type) } };
  }
  const next = PRIMITIVES.filter((t) => t === type || allowed.includes(t));
  return { ...s, settings: { ...s.settings, allowed: next } };
}

export function setPieces(s: RotationState, n: number): RotationState {
  return { ...s, settings: { ...s.settings, pieces: clamp(n, 1, 6) } };
}

export function setRender(s: RotationState, patch: Partial<RenderOptions>): RotationState {
  return { ...s, settings: { ...s.settings, render: { ...s.settings.render, ...patch } } };
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
