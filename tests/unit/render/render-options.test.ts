import { describe, expect, it } from 'vitest';
import { DEFAULT_RENDER, renderKey } from '../../../src/render/render-options';
import type { RenderOptions } from '../../../src/render/render-options';

describe('renderKey', () => {
  it('has the documented default', () => {
    expect(renderKey(DEFAULT_RENDER)).toBe('normal|h0|b0|c0|g0|shaded');
  });
  it('differs for every field', () => {
    const flips: Partial<RenderOptions>[] = [
      { lens: 'wide' },
      { hidden: true },
      { box: true },
      { centreLines: true },
      { ground: true },
      { mode: 'lines' },
    ];
    const keys = [renderKey(DEFAULT_RENDER), ...flips.map((f) => renderKey({ ...DEFAULT_RENDER, ...f }))];
    expect(new Set(keys).size).toBe(keys.length);
  });
});
