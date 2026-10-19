import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';
import { zipSync } from 'fflate';
import type { FormSpec } from '../geometry/types';
import type { Settings } from '../modes/rotation/state';
import { viewSlug } from '../views/label';
import type { View } from '../views/types';

export interface SavedShot {
  view: View;
  label: string;
  image: Blob;
  /** Set on the top-view map shot, which has its own filename. */
  role?: 'map';
}

export interface SavedSet {
  id: string;
  createdAt: number;
  form: FormSpec;
  /** The exercise settings in force when it was saved; opening the set restores them. */
  settings: Settings;
  hidden: boolean;
  shots: SavedShot[];
}

export type SaveResult = { ok: true; id: string } | { ok: false; reason: 'blocked' | 'quota' | 'unknown' };

const DB_NAME = 'turnaround';
const STORE = 'sets';

/** Throws a SecurityError when storage is missing. */
function open(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined' || indexedDB === null) {
    return Promise.reject(new DOMException('IndexedDB is not available', 'SecurityError'));
  }
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('createdAt', 'createdAt');
    },
  });
}

function failure(e: unknown): Extract<SaveResult, { ok: false }> {
  const name = e instanceof Error || e instanceof DOMException ? e.name : '';
  if (name === 'SecurityError' || name === 'InvalidStateError') return { ok: false, reason: 'blocked' };
  if (name === 'QuotaExceededError') return { ok: false, reason: 'quota' };
  return { ok: false, reason: 'unknown' };
}

/** Strictly increasing, so two sets saved in the same millisecond still sort. */
let lastCreated = 0;

export async function saveSet(set: Omit<SavedSet, 'id' | 'createdAt'>): Promise<SaveResult> {
  try {
    const db = await open();
    try {
      lastCreated = Math.max(Date.now(), lastCreated + 1);
      const saved: SavedSet = { ...set, id: crypto.randomUUID(), createdAt: lastCreated };
      await db.put(STORE, saved);
      return { ok: true, id: saved.id };
    } finally {
      db.close();
    }
  } catch (e) {
    return failure(e);
  }
}

/** Newest first. */
export async function listSets(): Promise<SavedSet[] | { error: 'blocked' }> {
  try {
    const db = await open();
    try {
      const sets: SavedSet[] = await db.getAllFromIndex(STORE, 'createdAt');
      return sets.reverse();
    } finally {
      db.close();
    }
  } catch {
    return { error: 'blocked' };
  }
}

export async function deleteSet(id: string): Promise<void> {
  const db = await open();
  try {
    await db.delete(STORE, id);
  } finally {
    db.close();
  }
}

/** `<viewSlug>.png`, or `top-view-map.png` for the map shot. */
export function shotFilename(shot: Pick<SavedShot, 'view' | 'role'>): string {
  return shot.role === 'map' ? 'top-view-map.png' : `${viewSlug(shot.view)}.png`;
}

/** Equal names get `-2`, `-3` before the extension. */
export function uniqueNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((name) => {
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return n === 1 ? name : name.replace(/\.png$/, `-${n}.png`);
  });
}

export async function zipSet(set: Pick<SavedSet, 'shots'>): Promise<Blob> {
  const names = uniqueNames(set.shots.map(shotFilename));
  const files: Record<string, Uint8Array> = {};
  const images = await Promise.all(set.shots.map(async (s) => new Uint8Array(await s.image.arrayBuffer())));
  names.forEach((name, i) => {
    files[name] = images[i];
  });
  // PNGs are already compressed.
  return new Blob([zipSync(files, { level: 0 }) as Uint8Array<ArrayBuffer>], { type: 'application/zip' });
}
