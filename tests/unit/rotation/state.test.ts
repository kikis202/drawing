import { describe, expect, it } from 'vitest';
import {
  allShots,
  captureView,
  initialState,
  keptShots,
  setForm,
  setRender,
  setLive,
  setPieces,
  setShotCount,
  toggleAllowed,
  toggleKeep,
} from '../../../src/modes/rotation/state';
import { DEFAULT_RENDER } from '../../../src/render/render-options';
import { ringViews } from '../../../src/views/spacing';
import type { FormMesh, FormSpec } from '../../../src/geometry/types';

const spec: FormSpec = {
  version: 1,
  seed: 0,
  pieces: [{ type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
};
const mesh: FormMesh = { positions: new Float32Array(9), indices: new Uint32Array(3), volume: 1 };

describe('rotation state', () => {
  it('has the documented defaults', () => {
    expect(initialState.settings).toEqual({
      allowed: ['cube', 'sphere', 'cylinder', 'cone', 'pyramid'],
      pieces: 3,
      shotCount: 8,
      render: DEFAULT_RENDER,
    });
    expect(initialState.live).toEqual({ turn: 30, tilt: 20 });
    expect(initialState.form).toBeNull();
  });

  it('setForm generates shots, clears custom shots and ticks and bumps the version', () => {
    let s = setForm(initialState, spec, mesh);
    expect(s.form?.version).toBe(1);
    expect(s.generated.map((g) => g.id)).toEqual(ringViews(8).map((_, i) => `g${i}`));
    s = captureView(toggleKeep(s, 'g1'));
    const t = setForm(s, spec, mesh);
    expect(t.form?.version).toBe(2);
    expect(t.custom).toEqual([]);
    expect(t.kept).toEqual([]);
    expect(t.activeShotId).toBeNull();
    expect(t.nextCustomId).toBe(s.nextCustomId);
    expect(t.live).toEqual(s.live);
    expect(t.settings).toBe(s.settings);
  });

  it('setShotCount keeps ticked shots as custom shots', () => {
    let s = setForm(initialState, spec, mesh);
    s = toggleKeep(s, 'g3');
    s = setShotCount(s, 12);
    expect(s.generated).toHaveLength(12);
    expect(keptShots(s)).toEqual([
      expect.objectContaining({ source: 'custom', view: ringViews(8)[3] }),
    ]);
    expect(allShots(s)).toHaveLength(13);
  });

  it('setShotCount clamps to 2..36', () => {
    const s = setForm(initialState, spec, mesh);
    expect(setShotCount(s, 1).settings.shotCount).toBe(2);
    expect(setShotCount(s, 99).settings.shotCount).toBe(36);
    expect(setShotCount(s, 99).generated).toHaveLength(36);
  });

  it('setShotCount returns the same state when the count is unchanged', () => {
    const s = toggleKeep(setForm(initialState, spec, mesh), 'g0');
    expect(setShotCount(s, 8)).toBe(s);
    expect(setShotCount(s, 8.4)).toBe(s);
  });

  it('setShotCount remaps the active generated shot', () => {
    let s = setForm(initialState, spec, mesh);
    s = setLive(toggleKeep(s, 'g2'), ringViews(8)[2], 'g2');
    expect(setShotCount(s, 12).activeShotId).toBe('c0');
    s = setLive(s, ringViews(8)[4], 'g4');
    expect(setShotCount(s, 12).activeShotId).toBeNull();
  });

  it('cannot turn off the last allowed shape', () => {
    let s = initialState;
    for (const t of ['sphere', 'cylinder', 'cone', 'pyramid'] as const) s = toggleAllowed(s, t);
    expect(s.settings.allowed).toEqual(['cube']);
    expect(toggleAllowed(s, 'cube')).toBe(s);
    expect(toggleAllowed(s, 'cone').settings.allowed).toEqual(['cube', 'cone']);
  });

  it('clamps pieces to 1..6 and patches render options', () => {
    expect(setPieces(initialState, 0).settings.pieces).toBe(1);
    expect(setPieces(initialState, 9).settings.pieces).toBe(6);
    expect(setRender(initialState, { hidden: true }).settings.render).toEqual({ ...DEFAULT_RENDER, hidden: true });
    expect(setRender(initialState, { lens: 'wide' }).settings.render.lens).toBe('wide');
  });

  it('captureView adds a kept, active custom shot at the live view', () => {
    let s = setForm(initialState, spec, mesh);
    s = setLive(s, { turn: 100, tilt: -10 }, null);
    s = captureView(s);
    expect(s.custom).toEqual([{ id: 'c0', view: { turn: 100, tilt: -10 }, source: 'custom' }]);
    expect(s.kept).toEqual(['c0']);
    expect(s.activeShotId).toBe('c0');
    expect(captureView(s).custom[1].id).toBe('c1');
  });

  it('toggleKeep ticks and unticks; keptShots is generated then custom', () => {
    let s = setForm(initialState, spec, mesh);
    s = captureView(s);
    s = toggleKeep(toggleKeep(s, 'g5'), 'g2');
    expect(keptShots(s).map((x) => x.id)).toEqual(['g2', 'g5', 'c0']);
    s = toggleKeep(s, 'g2');
    expect(s.kept).not.toContain('g2');
  });
});
