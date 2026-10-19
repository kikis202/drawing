// @vitest-environment node
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unzipSync } from 'fflate';
import { deleteSet, listSets, saveSet, zipSet } from '../../../src/storage/saved-sets';
import type { SavedSet } from '../../../src/storage/saved-sets';
import { defaultSettings } from '../../../src/modes/rotation/state';
import type { FormSpec } from '../../../src/geometry/types';

const form: FormSpec = {
  version: 2,
  style: 'freeform',
  seed: 0,
  pieces: [{ type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
};

const png = (text: string) => new Blob([text], { type: 'image/png' });

function draft(...views: { turn: number; tilt: number }[]): Omit<SavedSet, 'id' | 'createdAt'> {
  return {
    form,
    settings: defaultSettings(),
    hidden: false,
    shots: views.map((view, i) => ({ view, label: `shot ${i}`, image: png(`img${i}`) })),
  };
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('saved sets', () => {
  it('saves and lists newest first', async () => {
    const a = await saveSet(draft({ turn: 0, tilt: 0 }));
    const b = await saveSet(draft({ turn: 30, tilt: 10 }, { turn: 60, tilt: 0 }));
    expect(a.ok && b.ok).toBe(true);
    const sets = await listSets();
    if ('error' in sets) throw new Error('unexpected');
    expect(sets.map((s) => s.id)).toEqual([(b as { id: string }).id, (a as { id: string }).id]);
    expect(sets[0].shots).toHaveLength(2);
    expect(sets[0].settings).toEqual(defaultSettings());
    expect(sets[0].form).toEqual(form);
    expect(await sets[0].shots[0].image.text()).toBe('img0');
  });

  it('deletes a set', async () => {
    const a = await saveSet(draft({ turn: 0, tilt: 0 }));
    await deleteSet((a as { id: string }).id);
    expect(await listSets()).toEqual([]);
  });

  it('reports blocked storage', async () => {
    vi.stubGlobal('indexedDB', undefined);
    expect(await saveSet(draft({ turn: 0, tilt: 0 }))).toEqual({ ok: false, reason: 'blocked' });
    expect(await listSets()).toEqual({ error: 'blocked' });
  });

  it('reports full storage', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new DOMException('', 'QuotaExceededError');
    });
    expect(await saveSet(draft({ turn: 0, tilt: 0 }))).toEqual({ ok: false, reason: 'quota' });
  });

  it('reports anything else as unknown', async () => {
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(await saveSet(draft({ turn: 0, tilt: 0 }))).toEqual({ ok: false, reason: 'unknown' });
  });

  it('zipSet names files by view', async () => {
    const set: SavedSet = {
      ...draft({ turn: 0, tilt: 60 }, { turn: 90, tilt: -30 }),
      id: 'x',
      createdAt: 1,
    };
    const files = unzipSync(new Uint8Array(await (await zipSet(set)).arrayBuffer()));
    expect(Object.keys(files)).toEqual(['0-turn-60-tilt.png', '90-turn-minus30-tilt.png']);
  });

  it('zipSet names the map shot and de-duplicates equal names', async () => {
    const set: SavedSet = {
      ...draft({ turn: 0, tilt: 90 }, { turn: 10, tilt: 20 }, { turn: 10, tilt: 20 }, { turn: 10, tilt: 20 }),
      id: 'x',
      createdAt: 1,
    };
    set.shots[0].role = 'map';
    const files = unzipSync(new Uint8Array(await (await zipSet(set)).arrayBuffer()));
    expect(Object.keys(files)).toEqual([
      'top-view-map.png',
      '10-turn-20-tilt.png',
      '10-turn-20-tilt-2.png',
      '10-turn-20-tilt-3.png',
    ]);
  });
});
