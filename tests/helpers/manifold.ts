import Module from 'manifold-3d';
import type { ManifoldToplevel } from 'manifold-3d';

let instance: Promise<ManifoldToplevel> | undefined;

export function getTestManifold(): Promise<ManifoldToplevel> {
  instance ??= Module().then((wasm) => {
    wasm.setup();
    return wasm;
  });
  return instance;
}
