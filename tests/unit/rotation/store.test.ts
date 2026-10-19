import { beforeAll, describe, expect, it } from 'vitest';
import { createRotationStore } from '../../../src/modes/rotation/store';
import { setPieces, toggleKeep } from '../../../src/modes/rotation/state';
import type { ManifoldToplevel } from '../../../src/geometry/manifold';
import type { FormSpec } from '../../../src/geometry/types';
import { getTestManifold } from '../../helpers/manifold';

let wasm: ManifoldToplevel;
beforeAll(async () => {
  wasm = await getTestManifold();
});

const cube: FormSpec = {
  version: 2,
  style: 'freeform',
  seed: 0,
  pieces: [{ type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
};

describe('rotation store', () => {
  it('newObject generates a form with the current settings', () => {
    const store = createRotationStore(wasm);
    expect(store.state.value.form).toBeNull();
    store.dispatch(setPieces, 2);
    store.newObject();
    const { form, generated } = store.state.value;
    expect(form?.version).toBe(1);
    expect(form?.spec.pieces).toHaveLength(2);
    expect(generated).toHaveLength(8);
  });

  it('openSaved loads the form with the saved views as kept custom shots', () => {
    const store = createRotationStore(wasm);
    store.dispatch(toggleKeep, 'g0');
    store.openSaved({ form: cube, shots: [{ view: { turn: 10, tilt: 5 } }, { view: { turn: 200, tilt: -40 } }] });
    const s = store.state.value;
    expect(s.form?.spec).toEqual(cube);
    expect(s.custom.map((c) => c.view)).toEqual([{ turn: 10, tilt: 5 }, { turn: 200, tilt: -40 }]);
    expect(s.kept).toEqual(s.custom.map((c) => c.id));
    expect(new Set([...s.generated, ...s.custom].map((x) => x.id)).size).toBe(s.generated.length + 2);
    expect(s.settings.shotCount).toBe(8);
  });
});
