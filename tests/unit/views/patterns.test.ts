import { describe, expect, it } from 'vitest';
import { shotLabel } from '../../../src/views/label';
import { ringViews } from '../../../src/views/spacing';
import {
  DEFAULT_PLAN,
  MAP_VIEW,
  planColumns,
  planShots,
  planSummary,
  type ShotPlan,
} from '../../../src/views/patterns';

const plan = (over: Partial<ShotPlan>): ShotPlan => ({ ...DEFAULT_PLAN, ...over });
const views = (p: ShotPlan) => planShots(p).map((s) => s.view);

describe('shot patterns', () => {
  it('turntable 90° at eye level → 4 shots from turn 30', () => {
    expect(views(DEFAULT_PLAN)).toEqual([
      { turn: 30, tilt: 0 },
      { turn: 120, tilt: 0 },
      { turn: 210, tilt: 0 },
      { turn: 300, tilt: 0 },
    ]);
    expect(views(plan({ turntable: { step: 30, tilt: 'below' } }))).toHaveLength(12);
    expect(views(plan({ turntable: { step: 45, tilt: 'below' } }))[0]).toEqual({
      turn: 30,
      tilt: -30,
    });
  });

  it('grid 6x3 → 18 shots, rows +45/0/−45, 6 columns', () => {
    const p = plan({ pattern: 'grid' });
    const v = views(p);
    expect(v).toHaveLength(18);
    expect(v.slice(0, 6).map((x) => x.turn)).toEqual([30, 90, 150, 210, 270, 330]);
    expect([v[0].tilt, v[6].tilt, v[12].tilt]).toEqual([45, 0, -45]);
    expect(planColumns(p)).toBe(6);
    expect(planColumns(DEFAULT_PLAN)).toBeNull();
    const big = views(plan({ pattern: 'grid', grid: { size: '8x5' } }));
    expect(big).toHaveLength(40);
    expect([0, 8, 16, 24, 32].map((i) => big[i].tilt)).toEqual([60, 30, 0, -30, -60]);
  });

  it('vertical sequence wraps turn at a fixed tilt', () => {
    const v = views(
      plan({
        pattern: 'sequence',
        sequence: { axis: 'vertical', steps: '4x30', start: { turn: 300, tilt: 20 } },
      }),
    );
    expect(v).toEqual([
      { turn: 300, tilt: 20 },
      { turn: 330, tilt: 20 },
      { turn: 0, tilt: 20 },
      { turn: 30, tilt: 20 },
    ]);
  });

  it('sideways sequence stays within ±89 by shifting its start', () => {
    const v = views(
      plan({
        pattern: 'sequence',
        sequence: { axis: 'sideways', steps: '6x15', start: { turn: 30, tilt: 70 } },
      }),
    );
    expect(v).toHaveLength(6);
    expect(v.map((x) => x.tilt)).toEqual([14, 29, 44, 59, 74, 89]);
    expect(v.every((x) => x.turn === 30)).toBe(true);
  });

  const sideways = (steps: '4x15' | '6x15' | '4x30', tilt: number, turn = 30, topMap = false) =>
    plan({ pattern: 'sequence', topMap, sequence: { axis: 'sideways', steps, start: { turn, tilt } } });

  it('sideways sequence keeps an unshifted start and clamps extreme starts', () => {
    expect(views(sideways('6x15', 0)).map((x) => x.tilt)).toEqual([0, 15, 30, 45, 60, 75]);
    expect(views(sideways('4x30', -120)).map((x) => x.tilt)).toEqual([-89, -59, -29, 1]);
    expect(views(sideways('4x30', 100)).map((x) => x.tilt)).toEqual([-1, 29, 59, 89]);
  });

  it('never emits -0 and turntable above is +30', () => {
    const v = views(
      plan({
        pattern: 'sequence',
        sequence: { axis: 'vertical', steps: '4x15', start: { turn: 0, tilt: -0 } },
      }),
    );
    expect(v[0]).toEqual({ turn: 0, tilt: 0 });
    expect(views(plan({ turntable: { step: 90, tilt: 'above' } }))[0].tilt).toBe(30);
  });

  it('map is skipped whenever the pattern already has a top view', () => {
    const p = sideways('6x15', 70, 0, true);
    expect(planShots(p)).toHaveLength(6);
    expect(planShots(p).some((s) => s.role === 'map')).toBe(false);
    expect(planSummary(p)).toBe('6 steps of 15° side to side');
    const above = plan({ topMap: true, turntable: { step: 90, tilt: 'above' } });
    expect(planShots(above)[0].role).toBe('map');
    expect(planSummary(above)).toMatch(/, plus a top-view map$/);
  });

  it('all around uses the ring spread', () => {
    for (const count of [6, 8, 12, 24] as const) {
      expect(views(plan({ pattern: 'allAround', allAround: { count } }))).toEqual(ringViews(count));
    }
  });

  it('top map comes first and is skipped for orthographic', () => {
    const shots = planShots(plan({ topMap: true }));
    expect(shots).toHaveLength(5);
    expect(shots[0]).toEqual({ view: MAP_VIEW, role: 'map' });
    expect(shots[1].role).toBeUndefined();
    expect(planShots(plan({ pattern: 'orthographic', topMap: true }))).toHaveLength(6);
    expect(views(plan({ pattern: 'orthographic' }))).toEqual([
      { turn: 0, tilt: 0 },
      { turn: 90, tilt: 0 },
      { turn: 180, tilt: 0 },
      { turn: 270, tilt: 0 },
      { turn: 0, tilt: 89 },
      { turn: 45, tilt: 30 },
    ]);
  });

  it('summaries read as the spec says', () => {
    expect(planSummary(plan({ turntable: { step: 45, tilt: 'level' } }))).toBe(
      '8 shots, 45° apart, at eye level',
    );
    expect(planSummary(plan({ turntable: { step: 45, tilt: 'above' } }))).toBe(
      '8 shots, 45° apart, above',
    );
    expect(planSummary(plan({ pattern: 'grid' }))).toBe('18 shots: 6 turns × 3 tilts');
    expect(planSummary(plan({ pattern: 'sequence' }))).toBe(
      '6 steps of 15° around the vertical axis',
    );
    expect(
      planSummary(
        plan({
          pattern: 'sequence',
          sequence: { ...DEFAULT_PLAN.sequence, axis: 'sideways' },
        }),
      ),
    ).toBe('6 steps of 15° side to side');
    expect(planSummary(plan({ pattern: 'allAround' }))).toBe(
      '8 shots spread above, level and below',
    );
    expect(planSummary(plan({ pattern: 'orthographic', topMap: true }))).toBe(
      'Front, sides, back, top and a 3/4 view',
    );
    expect(planSummary(plan({ topMap: true }))).toBe(
      '4 shots, 90° apart, at eye level, plus a top-view map',
    );
  });

  it('shotLabel names the map', () => {
    expect(shotLabel({ id: 'a', view: MAP_VIEW, source: 'generated', role: 'map' })).toBe(
      'Top view (map)',
    );
    expect(shotLabel({ id: 'b', view: { turn: 135, tilt: -30 }, source: 'generated' })).toBe(
      '135° turn, −30° tilt',
    );
  });
});
