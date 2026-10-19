import { describe, expect, it } from 'vitest';
import { collectImages } from '../../../src/modes/rotation/save-shots';
import type { Shot } from '../../../src/views/types';

const shots: Shot[] = [
  { id: 'g0', view: { turn: 0, tilt: 0 }, source: 'generated' },
  { id: 'g1', view: { turn: 0, tilt: 90 }, source: 'generated', role: 'map' },
];

describe('collectImages', () => {
  it('pairs each shot with its image and label', async () => {
    const result = await collectImages(shots, { blob: async (s) => new Blob([s.id]) });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.shots.map((s) => s.label)).toEqual(['0° turn, 0° tilt', 'Top view (map)']);
    expect(result.shots.map((s) => s.role)).toEqual([undefined, 'map']);
  });

  it('save during New object reports superseded', async () => {
    const result = await collectImages(shots, {
      blob: (s) => (s.id === 'g1' ? Promise.reject(new Error('superseded')) : Promise.resolve(new Blob(['x']))),
    });
    expect(result).toEqual({ ok: false, reason: 'superseded' });
  });

  it('reports other failures as unknown', async () => {
    const result = await collectImages(shots, { blob: () => Promise.reject(new Error('render failed')) });
    expect(result).toEqual({ ok: false, reason: 'unknown' });
  });
});
