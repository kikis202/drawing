import { describe, expect, it } from 'vitest';
import { cameraPosition, DISTANCE, FOV_DEG, fovForAspect, LENS_FOV, lensDistance } from '../../../src/views/camera';
import { viewLabel, viewSlug } from '../../../src/views/label';
import {
  applyDrag,
  applyKey,
  clampTilt,
  easeInOut,
  interpolateView,
  wrapTurn,
} from '../../../src/views/pose';
import { ringViews } from '../../../src/views/spacing';

describe('ringViews', () => {
  it('8 shots → rings at 60, 0, −60 with 2, 4, 2 shots', () =>
    expect(ringViews(8)).toEqual([
      { turn: 0, tilt: 60 }, { turn: 180, tilt: 60 },
      { turn: 0, tilt: 0 }, { turn: 90, tilt: 0 }, { turn: 180, tilt: 0 }, { turn: 270, tilt: 0 },
      { turn: 0, tilt: -60 }, { turn: 180, tilt: -60 },
    ]));
  it('2 shots → front and back at eye level', () =>
    expect(ringViews(2)).toEqual([{ turn: 0, tilt: 0 }, { turn: 180, tilt: 0 }]));
  it('every x in 2..36 gives exactly x distinct views within tilt (−90, 90)', () => {
    for (let x = 2; x <= 36; x++) {
      const views = ringViews(x);
      expect(views).toHaveLength(x);
      expect(new Set(views.map((v) => `${v.turn}/${v.tilt}`)).size).toBe(x);
      for (const v of views) {
        expect(v.tilt).toBeGreaterThan(-90);
        expect(v.tilt).toBeLessThan(90);
        expect(v.turn).toBeGreaterThanOrEqual(0);
        expect(v.turn).toBeLessThan(360);
        expect(Object.is(v.turn, -0)).toBe(false);
        expect(Object.is(v.tilt, -0)).toBe(false);
      }
    }
  });
});

describe('camera', () => {
  it('framing is identical for every aspect', () => {
    for (const aspect of [0.4, 0.75, 1, 1.6, 3]) {
      const half = (fovForAspect(aspect) / 2) * Math.PI / 180;
      expect(Math.tan(half) * Math.min(1, aspect)).toBeCloseTo(Math.tan(16 * Math.PI / 180), 6);
    }
  });
  it('cameraPosition is finite and at DISTANCE at the tilt limit', () => {
    for (const tilt of [-89, 0, 89]) {
      const p = cameraPosition({ turn: 123, tilt });
      expect(p.every(Number.isFinite)).toBe(true);
      expect(Math.hypot(...p)).toBeCloseTo(DISTANCE, 6);
    }
  });
  it('framing is identical for every lens and aspect', () => {
    for (const lens of ['flat', 'normal', 'wide'] as const)
      for (const aspect of [0.4, 0.75, 1, 1.6, 3]) {
        const half = (fovForAspect(aspect, lens) / 2) * Math.PI / 180;
        expect(lensDistance(lens) * Math.tan(half) * Math.min(1, aspect)).toBeCloseTo(
          1.15 / Math.cos((LENS_FOV[lens] * Math.PI) / 360),
          6,
        );
      }
  });
  it('cameraPosition sits at the lens distance', () => {
    for (const lens of ['flat', 'normal', 'wide'] as const)
      expect(Math.hypot(...cameraPosition({ turn: 70, tilt: 25 }, lens))).toBeCloseTo(lensDistance(lens), 6);
  });
  it('normal lens keeps the old constants', () => {
    expect(lensDistance('normal')).toBe(DISTANCE);
    expect(fovForAspect(1)).toBe(FOV_DEG);
    expect(LENS_FOV).toEqual({ flat: 15, normal: 32, wide: 55 });
  });
  it('front view sits on +z', () => {
    const p = cameraPosition({ turn: 0, tilt: 0 });
    expect(p[0]).toBeCloseTo(0);
    expect(p[1]).toBeCloseTo(0);
    expect(p[2]).toBeCloseTo(DISTANCE);
  });
});

describe('pose', () => {
  it('drag clamps tilt', () => expect(applyDrag({ turn: 0, tilt: 80 }, 0, 1000).tilt).toBe(89));
  it('drag turns by −0.4 per px and tilts by 0.3 per px', () => {
    const v = applyDrag({ turn: 10, tilt: 0 }, 10, 10);
    expect(v.turn).toBeCloseTo(6);
    expect(v.tilt).toBeCloseTo(3);
  });
  it('wrapTurn wraps into [0, 360) and never returns −0', () => {
    expect(wrapTurn(-90)).toBe(270);
    expect(wrapTurn(360)).toBe(0);
    expect(wrapTurn(725)).toBe(5);
    expect(wrapTurn(-360)).toEqual(0);
  });
  it('clampTilt clamps to [−89, 89]', () => {
    expect(clampTilt(100)).toBe(89);
    expect(clampTilt(-100)).toBe(-89);
    expect(clampTilt(12)).toBe(12);
  });
  it('interpolates the short way round', () => {
    expect(interpolateView({ turn: 350, tilt: 0 }, { turn: 10, tilt: 0 }, 0.5).turn).toBeCloseTo(0);
    expect(interpolateView({ turn: 10, tilt: 0 }, { turn: 350, tilt: 0 }, 0.25).turn).toBeCloseTo(5);
    expect(interpolateView({ turn: 350, tilt: 0 }, { turn: 10, tilt: 0 }, 0.25).turn).toBeCloseTo(355);
  });
  it('interpolates tilt linearly and hits the endpoints', () => {
    const a = { turn: 90, tilt: -30 };
    const b = { turn: 180, tilt: 50 };
    expect(interpolateView(a, b, 0)).toEqual(a);
    expect(interpolateView(a, b, 1)).toEqual(b);
    expect(interpolateView(a, b, 0.5).tilt).toBeCloseTo(10);
  });
  it('easeInOut is 0, 0.5, 1 at 0, 0.5, 1', () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(0.5)).toBe(0.5);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.25)).toBeCloseTo(0.125);
  });
  it('applyKey steps by 5° or 15° with shift', () => {
    const v = { turn: 0, tilt: 0 };
    expect(applyKey(v, 'ArrowRight', false)).toEqual({ turn: 355, tilt: 0 });
    expect(applyKey(v, 'ArrowLeft', true)).toEqual({ turn: 15, tilt: 0 });
    expect(applyKey(v, 'ArrowDown', false)).toEqual({ turn: 0, tilt: 5 });
    expect(applyKey(v, 'ArrowUp', true)).toEqual({ turn: 0, tilt: -15 });
    expect(applyKey({ turn: 0, tilt: 87 }, 'ArrowDown', true)?.tilt).toBe(89);
  });
  it('applyKey ignores other keys', () => expect(applyKey({ turn: 0, tilt: 0 }, 'a', false)).toBeNull());
});

describe('labels', () => {
  it('labels with a real minus sign', () =>
    expect(viewLabel({ turn: 135, tilt: -30 })).toBe('135° turn, −30° tilt'));
  it('rounds and wraps', () => {
    expect(viewLabel({ turn: -90.2, tilt: 29.6 })).toBe('270° turn, 30° tilt');
    expect(viewLabel({ turn: 359.7, tilt: -0.2 })).toBe('0° turn, 0° tilt');
  });
  it('rounds mirrored tilts to equal magnitudes', () => {
    expect(viewLabel({ turn: 0, tilt: 22.5 })).toBe('0° turn, 23° tilt');
    expect(viewLabel({ turn: 0, tilt: -22.5 })).toBe('0° turn, −23° tilt');
    expect(viewSlug({ turn: 0, tilt: 22.5 })).toBe('0-turn-23-tilt');
    expect(viewSlug({ turn: 0, tilt: -22.5 })).toBe('0-turn-minus23-tilt');
  });
  it('ringViews(16) labels are mirror symmetric', () => {
    const views = ringViews(16);
    const tilts = new Set(views.map((v) => v.tilt));
    for (const t of tilts) {
      const a = viewLabel({ turn: 0, tilt: t }).replace('−', '');
      const b = viewLabel({ turn: 0, tilt: -t }).replace('−', '');
      expect(a).toBe(b);
    }
  });
  it('applyKey normalises both fields from out-of-range input', () => {
    for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
      const r = applyKey({ turn: 370, tilt: 95 }, key, false)!;
      expect(r.turn).toBeGreaterThanOrEqual(0);
      expect(r.turn).toBeLessThan(360);
      expect(r.tilt).toBeLessThanOrEqual(89);
    }
  });
  it('slugs', () => {
    expect(viewSlug({ turn: 135, tilt: -30 })).toBe('135-turn-minus30-tilt');
    expect(viewSlug({ turn: 0, tilt: 60 })).toBe('0-turn-60-tilt');
  });
});
