import { signal } from '@preact/signals';
import type { Signal } from '@preact/signals';
import { buildForm } from '../../geometry/build-form';
import { generateForm } from '../../geometry/generate';
import type { ManifoldToplevel } from '../../geometry/manifold';
import type { FormSpec } from '../../geometry/types';
import type { View } from '../../views/types';
import { initialState, setForm } from './state';
import type { RotationState } from './state';

/** The part of a saved set that opening one needs. */
export interface OpenableSet {
  form: FormSpec;
  shots: { view: View }[];
}

export function createRotationStore(wasm: ManifoldToplevel) {
  const state: Signal<RotationState> = signal(initialState);

  function dispatch<A extends unknown[]>(
    action: (s: RotationState, ...a: A) => RotationState,
    ...a: A
  ): void {
    state.value = action(state.value, ...a);
  }

  /** Generates synchronously; call only once the manifold module has loaded. */
  function newObject(): void {
    const seed = (Date.now() ^ (Math.random() * 2 ** 32)) >>> 0;
    const { allowed, pieces } = state.value.settings;
    const spec = generateForm(wasm, seed, { allowed, pieces });
    dispatch(setForm, spec, buildForm(wasm, spec));
  }

  function openSaved(set: OpenableSet): void {
    const withForm = setForm(state.value, set.form, buildForm(wasm, set.form));
    const custom = set.shots.map((shot, i) => ({
      id: `c${withForm.nextCustomId + i}`,
      view: { ...shot.view },
      source: 'custom' as const,
    }));
    state.value = {
      ...withForm,
      custom,
      kept: custom.map((c) => c.id),
      nextCustomId: withForm.nextCustomId + custom.length,
    };
  }

  return { state, newObject, openSaved, dispatch };
}
