import Module from 'manifold-3d';
import wasmUrl from 'manifold-3d/manifold.wasm?url';
import type { ManifoldToplevel } from 'manifold-3d';

export type { ManifoldToplevel, Manifold } from 'manifold-3d';

let instance: Promise<ManifoldToplevel> | undefined;

export function loadManifold(): Promise<ManifoldToplevel> {
  instance ??= Module({ locateFile: () => wasmUrl }).then((wasm) => {
    wasm.setup();
    return wasm;
  });
  return instance;
}
