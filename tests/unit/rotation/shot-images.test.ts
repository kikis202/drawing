import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShotImages } from '../../../src/modes/rotation/shot-images';
import type { ShotSource } from '../../../src/modes/rotation/shot-images';
import type { FormScene } from '../../../src/render/form-scene';
import type { FormMesh } from '../../../src/geometry/types';
import type { Shot, View } from '../../../src/views/types';
import { DEFAULT_RENDER } from '../../../src/render/render-options';
import type { RenderOptions } from '../../../src/render/render-options';
import { ringViews } from '../../../src/views/spacing';

const mesh = (): FormMesh => ({ positions: new Float32Array(9), indices: new Uint32Array(3), volume: 1, bounds: { min: [0, 0, 0], max: [0, 0, 0] }, axes: new Float32Array(0) });
const shotsOf = (n: number): Shot[] =>
  ringViews(n).map((view, i) => ({ id: `g${i}`, view, source: 'generated' as const }));

interface Pending {
  view: View;
  opts: RenderOptions;
  resolve: () => void;
}

function manualSource() {
  const pending: Pending[] = [];
  const source: ShotSource = {
    render: (_f, view, opts) =>
      new Promise<Blob>((res) => {
        pending.push({ view, opts, resolve: () => res(new Blob([`${view.turn}/${view.tilt}`])) });
      }),
  };
  return { source, pending };
}

const FLAT: RenderOptions = { ...DEFAULT_RENDER, lens: 'flat' };
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
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), DEFAULT_RENDER);
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
    images.update({ mesh: mesh(), version: 1 }, shotsOf(8), DEFAULT_RENDER);
    await flush();
    images.update({ mesh: mesh(), version: 2 }, shotsOf(8), DEFAULT_RENDER);
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
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), DEFAULT_RENDER);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(3), DEFAULT_RENDER);
    expect(scenes).toHaveLength(1);
    images.update({ mesh: mesh(), version: 2 }, shotsOf(2), DEFAULT_RENDER);
    expect(scenes).toHaveLength(2);
    expect(scenes[0].dispose).toHaveBeenCalledTimes(1);
    expect(scenes[1].dispose).not.toHaveBeenCalled();
    images.dispose();
    expect(scenes[1].dispose).toHaveBeenCalledTimes(1);
  });

  it('re-renders when the lens changes and revokes old URLs', async () => {
    const { source, pending } = manualSource();
    const { images, onChange } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), DEFAULT_RENDER);
    for (let i = 0; i < 2; i++) {
      await flush();
      pending.shift()!.resolve();
    }
    await flush();
    expect(onChange.mock.calls.at(-1)![0].size).toBe(2);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), FLAT);
    expect(revoke).toHaveBeenCalledTimes(2);
    await flush();
    expect(pending.map((p) => p.opts.lens)).toEqual(['flat']);
  });

  it('revokes URLs of shots no longer present', async () => {
    const { source, pending } = manualSource();
    const { images } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2), DEFAULT_RENDER);
    for (let i = 0; i < 2; i++) {
      await flush();
      pending.shift()!.resolve();
    }
    await flush();
    images.update({ mesh: mesh(), version: 1 }, shotsOf(2).slice(0, 1), DEFAULT_RENDER);
    expect(revoke).toHaveBeenCalledTimes(1);
  });

  it('blob() reuses a cached render and renders missing ones', async () => {
    const render = vi.fn(async (_f: FormScene, view: View, _opts: RenderOptions) => new Blob([`${view.turn}`]));
    const { images } = setup({ render });
    const shots = shotsOf(2);
    images.update({ mesh: mesh(), version: 1 }, shots, DEFAULT_RENDER);
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

  it('skips a shot whose render fails and keeps rendering the rest', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const shots = shotsOf(3);
    const render = vi.fn(async (_f: FormScene, view: View, _o: RenderOptions) => {
      if (view === shots[1].view) throw new Error('boom');
      return new Blob([`${view.turn}`]);
    });
    const { images, onChange } = setup({ render });
    images.update({ mesh: mesh(), version: 1 }, shots, DEFAULT_RENDER);
    for (let i = 0; i < 5; i++) await flush();
    expect(render).toHaveBeenCalledTimes(3);
    expect([...onChange.mock.calls.at(-1)![0].keys()]).toEqual(['g0', 'g2']);
    expect(counter).toBe(2);
    err.mockRestore();
  });

  it('rejects a pending blob() with superseded when the version changes', async () => {
    const { source, pending } = manualSource();
    const { images } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, [], DEFAULT_RENDER);
    const p = images.blob({ id: 'c0', view: { turn: 5, tilt: 5 }, source: 'custom' });
    const outcome = expect(p).rejects.toThrow('superseded');
    await flush();
    images.update({ mesh: mesh(), version: 2 }, [], DEFAULT_RENDER);
    await outcome;
    pending.splice(0).forEach((x) => x.resolve());
    await flush();
    expect(pending).toHaveLength(0);
  });

  it('rejects a pending blob() with superseded when the options change or on dispose', async () => {
    const { source } = manualSource();
    const { images } = setup(source);
    images.update({ mesh: mesh(), version: 1 }, [], DEFAULT_RENDER);
    const shot: Shot = { id: 'c0', view: { turn: 5, tilt: 5 }, source: 'custom' };
    const a = expect(images.blob(shot)).rejects.toThrow('superseded');
    images.update({ mesh: mesh(), version: 1 }, [], FLAT);
    await a;
    const b = expect(images.blob(shot)).rejects.toThrow('superseded');
    images.dispose();
    await b;
  });
});
