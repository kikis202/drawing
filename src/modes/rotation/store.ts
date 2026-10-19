import { batch, signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import { buildForm } from '../../geometry/build-form';
import { generateCleanForm, varyCleanForm } from '../../geometry/clean/generate-clean';
import { generateForm } from '../../geometry/generate';
import type { ManifoldToplevel } from '../../geometry/manifold';
import { checkSet } from '../../storage/saved-sets';
import type { SavedSet } from '../../storage/saved-sets';
import type { Shot, View } from '../../views/types';
import type { ExerciseId } from './exercises';
import { loadSettings, saveSettings } from './settings-storage';
import { applyExercise as applyExerciseTo, copyPlan, initialState, setForm } from './state';
import type { RotationState, Settings } from './state';

export function createRotationStore(wasm: ManifoldToplevel) {
  const state: Signal<RotationState> = signal({ ...initialState, settings: loadSettings() });

  /** Every settings change is remembered on this device. */
  function commit(next: RotationState): void {
    const changed = next.settings !== state.value.settings;
    state.value = next;
    if (changed) saveSettings(next.settings);
  }

  function dispatch<A extends unknown[]>(
    action: (s: RotationState, ...a: A) => RotationState,
    ...a: A
  ): void {
    commit(action(state.value, ...a));
  }

  /** Generates synchronously; call only once the manifold module has loaded. */
  function newObject(): void {
    const seed = (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0;
    const { style, level, allowed, joins, pieces } = state.value.settings;
    const spec =
      style === 'clean'
        ? generateCleanForm(wasm, seed, { level, allowed, joins })
        : generateForm(wasm, seed, { allowed, pieces });
    dispatch(setForm, spec, buildForm(wasm, spec), Math.random());
  }

  /** Same recipe, new proportions. Does nothing for Freeform, or when no other proportions build. */
  function variation(): void {
    const spec = state.value.form?.spec;
    if (!spec || spec.style !== 'clean') return;
    const next = varyCleanForm(wasm, spec);
    if (next === spec || next.variation === spec.variation) return;
    dispatch(setForm, next, buildForm(wasm, next), Math.random());
  }

  /** One change: the new settings never show with the old object's shots. */
  function applyExercise(id: ExerciseId): void {
    batch(() => {
      dispatch(applyExerciseTo, id);
      newObject();
    });
  }

  /**
   * Restores the set's settings, form and views without generating anything. A saved view that is one of the
   * restored pattern's shots keeps that shot; any other becomes a kept custom shot. Returns false, changing
   * nothing, when the stored record can't be used.
   */
  function openSaved(saved: SavedSet): boolean {
    const set = checkSet(saved);
    if (!set) return false;
    try {
      const settings: Settings = { ...set.settings, plan: copyPlan(set.settings.plan) };
      const withForm = setForm({ ...state.value, settings }, set.form, buildForm(wasm, set.form), Math.random());
      const same = (a: View, b: View) => a.turn === b.turn && a.tilt === b.tilt;
      const kept: string[] = [];
      const custom: Shot[] = [];
      let nextCustomId = withForm.nextCustomId;
      for (const shot of set.shots) {
        const existing =
          withForm.generated.find((g) => (shot.role === 'map' ? g.role === 'map' : same(g.view, shot.view))) ??
          custom.find((c) => same(c.view, shot.view));
        if (existing) {
          if (!kept.includes(existing.id)) kept.push(existing.id);
          continue;
        }
        const id = `c${nextCustomId++}`;
        custom.push({ id, view: { ...shot.view }, source: 'custom', ...(shot.role ? { role: shot.role } : {}) });
        kept.push(id);
      }
      commit({ ...withForm, custom, kept, nextCustomId });
      return true;
    } catch {
      return false;
    }
  }

  return { state, newObject, variation, applyExercise, openSaved, dispatch };
}
