import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShotImages } from '../../../src/modes/rotation/shot-images';
import type { ShotSource } from '../../../src/modes/rotation/shot-images';
import type { FormScene } from '../../../src/render/form-scene';
import type { FormMesh } from '../../../src/geometry/types';
import type { Shot, View } from '../../../src/views/types';
import { ringViews } from '../../../src/views/spacing';

const mesh = (): FormMesh => ({ positions: new Float32Array(9), indices: new Uint32Array(3), volume: 1 });
const shotsOf = (n: number): Shot[] =>
  ringViews(n).map((view, i) => ({ id: `g${i}`, view, source: 'generated' as const }));

interface Pending {
  view: View;
  hidden: boolean;
  resolve: () => void;
}

function manualSource() {
  const pending: Pending[] = [];
  const source: ShotSource = {
    render: (_f, view, hidden) =>
      new Promise<Blob>((res) => {
        pending.push({ view, hidden, resolve: () => res(new Blob([`${view.turn}/${view.tilt}`])) });
      }),
  };
  return { source, pending };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

let counter = 0;
let revoke: ReturnType<typeof vi.fn>;
beforeEach(() => {
  counter = 0;
  revoke = vi.fn();
  vi.stubGlobal('URL', { createObjectURL: () => `blob:${counter++}`, revokeObjectURL: revoke });
});
afterEach(() => vi.unstubAllGlobals());

function setup(source: ShotSource) {
  const scenes: { dispose: ReturnType<typeof vi.fn> }[] = [];
  const makeScene = () => {
    const sc = { dispose: vi.fn() };
    scenes.push(sc);
    return sc as unknown as FormScene;
  };
  const onChange = vi.fn<(m: ReadonlyMap<string, string>) => void>();
  return { images: new ShotImages(source, makeScene, onChange), scenes, onChange };
}

describe('ShotImages', () => {
  it('renders sequentially and reports the full map after each image', async () => {
    const { source, pending } = manualSource();
    const { images, onChange } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), false);
    await flush();
    expect(pending).toHaveLength(1);
    pending[0].resolve();
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(new Map([['g0', 'blob:0']]));
    expect(pending).toHaveLength(2);
    pending[1].resolve();
    await flush();
    expect(onChange).toHaveBeenLastCalledWith(new Map([['g0', 'blob:0'], ['g1', 'blob:1']]));
  });

  it('drops results from an outdated form', async () => {
    const { source, pending } = manualSource();
    const { images, onChange } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(8), false);
    await flush();
    images.update({ mesh: mesh(), version: 2 }, shotsOf(8), false);
    await flush();
    const old = pending.splice(0, pending.length);
    expect(old.length).toBeGreaterThan(0);
    old.forEach((p) => p.resolve());
    await flush();
    // the abandoned v1 renders resolving late must not reach onChange or create URLs
    expect(onChange).not.toHaveBeenCalled();
    expect(counter).toBe(0);
    for (let i = 0; i < 20 && pending.length; i++) {
      pending.shift()!.resolve();
      await flush();
    }
    const last = onChange.mock.calls.at(-1)![0];
    expect(last.size).toBe(8);
  });

  it('disposes the previous scene when the version changes and on dispose', () => {
    const { source } = manualSource();
    const { images, scenes } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), false);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(3), false);
    expect(scenes).toHaveLength(1);
    images.update({ mesh: mesh(), version: 2 }, shotsOf(2), false);
    expect(scenes).toHaveLength(2);
    expect(scenes[0].dispose).toHaveBeenCalledTimes(1);
    expect(scenes[1].dispose).not.toHaveBeenCalled();
    images.dispose();
    expect(scenes[1].dispose).toHaveBeenCalledTimes(1);
  });

  it('re-renders when hidden lines change and revokes old URLs', async () => {
    const { source, pending } = manualSource();
    const { images, onChange } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), false);
    for (let i = 0; i < 2; i++) {
      await flush();
      pending.shift()!.resolve();
    }
    await flush();
    expect(onChange.mock.calls.at(-1)![0].size).toBe(2);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), true);
    expect(revoke).toHaveBeenCalledTimes(2);
    await flush();
    expect(pending.map((p) => p.hidden)).toEqual([true]);
  });

  it('revokes URLs of shots no longer present', async () => {
    const { source, pending } = manualSource();
    const { images } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), false);
    for (let i = 0; i < 2; i++) {
      await flush();
      pending.shift()!.resolve();
    }
    await flush();
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2).slice(0, 1), false);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('blob() reuses a cached render and renders missing ones', async () => {
    const render = vi.fn(async (_f: FormScene, view: View, _hidden: boolean) => new Blob([`${view.turn}`]));
    const { images } = setup({ render });
    const shots = shotsOf(2);
    images.update({ mesh: mesh(), version: 1 }, shots, false);
    await flush();
    await flush();
    expect(render).toHaveBeenCalledTimes(2);
    const b = await images.blob(shots[0]);
    expect(await b.text()).toBe(`${shots[0].view.turn}`);
    expect(render).toHaveBeenCalledTimes(2);
    const extra: Shot = { id: 'c0', view: { turn: 33, tilt: 7 }, source: 'custom' };
    await images.blob(extra);
    expect(render).toHaveBeenCalledTimes(3);
    await images.blob(extra);
    expect(render).toHaveBeenCalledTimes(3);
  });
});
