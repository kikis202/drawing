import { shotLabel } from '../../views/label';
import type { Shot } from '../../views/types';
import type { SavedShot } from '../../storage/saved-sets';

export type Collected =
  | { ok: true; shots: SavedShot[] }
  | { ok: false; reason: 'superseded' | 'unknown' };

/**
 * The images for `shots`, all or nothing. `superseded` means the object or its render settings
 * changed while the images were being made, so none of them can be trusted.
 */
export async function collectImages(shots: Shot[], images: { blob(shot: Shot): Promise<Blob> }): Promise<Collected> {
  try {
    const blobs = await Promise.all(shots.map((shot) => images.blob(shot)));
    return {
      ok: true,
      shots: shots.map((shot, i) => ({
        view: { ...shot.view },
        label: shotLabel(shot),
        image: blobs[i],
        ...(shot.role === 'map' ? { role: 'map' as const } : {}),
      })),
    };
  } catch (e) {
    return { ok: false, reason: e instanceof Error && e.message === 'superseded' ? 'superseded' : 'unknown' };
  }
}
