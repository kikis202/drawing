import { clampTilt, wrapTurn } from './pose';
import { ringViews } from './spacing';
import type { View } from './types';

export type PatternId = 'turntable' | 'grid' | 'sequence' | 'allAround' | 'orthographic';

export interface ShotPlan {
  pattern: PatternId;
  turntable: { step: 90 | 45 | 30; tilt: 'above' | 'level' | 'below' };
  grid: { size: '4x3' | '6x3' | '8x5' };
  sequence: {
    axis: 'vertical' | 'sideways';
    steps: '4x15' | '6x15' | '4x30';
    start: View;
  };
  allAround: { count: 6 | 8 | 12 | 24 };
  topMap: boolean;
}

export const DEFAULT_PLAN: ShotPlan = {
  pattern: 'turntable',
  turntable: { step: 90, tilt: 'level' },
  grid: { size: '6x3' },
  sequence: { axis: 'vertical', steps: '6x15', start: { turn: 30, tilt: 20 } },
  allAround: { count: 8 },
  topMap: false,
};

export const MAP_VIEW: View = { turn: 0, tilt: 89 };

export interface PlannedShot {
  view: View;
  role?: 'map';
}

const START_TURN = 30;
const MAX_TILT = 89;
const TURNTABLE_TILT = { above: 30, level: 0, below: -30 };
const GRID_TILTS: Record<number, number[]> = {
  3: [45, 0, -45],
  5: [60, 30, 0, -30, -60],
};
const ORTHOGRAPHIC: View[] = [
  { turn: 0, tilt: 0 },
  { turn: 90, tilt: 0 },
  { turn: 180, tilt: 0 },
  { turn: 270, tilt: 0 },
  { turn: 0, tilt: MAX_TILT },
  { turn: 45, tilt: 30 },
];

/** Splits a setting like '6x15' into [6, 15]. */
function parseSetting(s: string): [number, number] {
  const [a, b] = s.split('x').map(Number);
  return [a, b];
}

/** The map is skipped when the pattern already includes a top view (tilt 89 at any turn). */
function hasMap(plan: ShotPlan): boolean {
  return plan.topMap && !patternViews(plan).some((v) => v.tilt >= MAX_TILT);
}

function patternViews(plan: ShotPlan): View[] {
  switch (plan.pattern) {
    case 'turntable': {
      const { step, tilt } = plan.turntable;
      return Array.from({ length: 360 / step }, (_, i) => ({
        turn: wrapTurn(START_TURN + i * step),
        tilt: TURNTABLE_TILT[tilt] + 0,
      }));
    }
    case 'grid': {
      const [turns, rows] = parseSetting(plan.grid.size);
      const views: View[] = [];
      for (const tilt of GRID_TILTS[rows]) {
        for (let i = 0; i < turns; i++) {
          views.push({ turn: wrapTurn(START_TURN + (i * 360) / turns), tilt: tilt + 0 });
        }
      }
      return views;
    }
    case 'sequence': {
      const { axis, steps, start } = plan.sequence;
      const [n, step] = parseSetting(steps);
      if (axis === 'vertical') {
        return Array.from({ length: n }, (_, i) => ({
          turn: wrapTurn(start.turn + i * step),
          tilt: clampTilt(start.tilt) + 0,
        }));
      }
      // N shots S° apart span (N−1)·S; shift the start down so the last one stays at or under 89.
      const first = Math.min(clampTilt(start.tilt), MAX_TILT - (n - 1) * step);
      return Array.from({ length: n }, (_, i) => ({
        turn: wrapTurn(start.turn),
        tilt: first + i * step + 0,
      }));
    }
    case 'allAround':
      return ringViews(plan.allAround.count);
    case 'orthographic':
      return ORTHOGRAPHIC.map((v) => ({ ...v }));
  }
}

export function planShots(plan: ShotPlan): PlannedShot[] {
  const shots: PlannedShot[] = patternViews(plan).map((view) => ({ view }));
  if (hasMap(plan)) shots.unshift({ view: { ...MAP_VIEW }, role: 'map' });
  return shots;
}

export function planColumns(plan: ShotPlan): number | null {
  return plan.pattern === 'grid' ? parseSetting(plan.grid.size)[0] : null;
}

export function planSummary(plan: ShotPlan): string {
  let text: string;
  switch (plan.pattern) {
    case 'turntable': {
      const { step, tilt } = plan.turntable;
      const where = tilt === 'level' ? 'at eye level' : tilt;
      text = `${360 / step} shots, ${step}° apart, ${where}`;
      break;
    }
    case 'grid': {
      const [turns, rows] = parseSetting(plan.grid.size);
      text = `${turns * rows} shots: ${turns} turns × ${rows} tilts`;
      break;
    }
    case 'sequence': {
      const [n, step] = parseSetting(plan.sequence.steps);
      const axis = plan.sequence.axis === 'vertical' ? 'around the vertical axis' : 'side to side';
      text = `${n} steps of ${step}° ${axis}`;
      break;
    }
    case 'allAround':
      text = `${plan.allAround.count} shots spread above, level and below`;
      break;
    case 'orthographic':
      text = 'Front, sides, back, top and a 3/4 view';
      break;
  }
  return hasMap(plan) ? `${text}, plus a top-view map` : text;
}
