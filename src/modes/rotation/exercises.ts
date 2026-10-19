import { PRIMITIVES, JOINS } from '../../geometry/types';
import { DEFAULT_RENDER } from '../../render/render-options';
import type { RenderOptions } from '../../render/render-options';
import type { PatternId, ShotPlan } from '../../views/patterns';
import type { Settings } from './state';

export type ExerciseId = 'boxBasics' | 'stacks' | 'chests' | 'intersections' | 'carved' | 'freeform';

export interface Exercise {
  id: ExerciseId;
  name: string;
  blurb: string;
  apply: Pick<Settings, 'style' | 'level' | 'allowed' | 'joins'> & {
    plan: Partial<ShotPlan> & { pattern: PatternId };
    render: Partial<RenderOptions>;
  };
}

/** Every aid is set, so an exercise always looks the same; the lens is Normal for all of them. */
const aids = (on: Partial<RenderOptions>): RenderOptions => ({ ...DEFAULT_RENDER, ...on });

const ABOVE_45 = { pattern: 'turntable', turntable: { step: 45, tilt: 'above' } } as const;

/** The spec's "Exercises (presets)" table, in order. */
export const EXERCISES: Exercise[] = [
  {
    id: 'boxBasics',
    name: 'Box basics',
    blurb: 'One box, quarter turns',
    apply: {
      style: 'clean',
      level: 1,
      allowed: ['cube'],
      joins: [],
      plan: { pattern: 'turntable', turntable: { step: 90, tilt: 'level' } },
      render: aids({ hidden: true }),
    },
  },
  {
    id: 'stacks',
    name: 'Stacks and totems',
    blurb: 'Clean stacks on one axis',
    apply: {
      style: 'clean',
      level: 3,
      allowed: ['cube', 'cylinder', 'cone', 'pyramid'],
      joins: ['stack', 'totem'],
      plan: ABOVE_45,
      render: aids({ centreLines: true }),
    },
  },
  {
    id: 'chests',
    name: 'Chests and lids',
    blurb: 'Half-sunk cylinders, hinges',
    apply: {
      style: 'clean',
      level: 6,
      allowed: ['cube', 'cylinder'],
      joins: ['stack', 'halfSunk', 'hinged'],
      plan: ABOVE_45,
      render: aids({ hidden: true }),
    },
  },
  {
    id: 'intersections',
    name: 'Intersections',
    blurb: 'Pieces passing through',
    apply: {
      style: 'clean',
      level: 4,
      allowed: ['cube', 'cylinder', 'cone', 'pyramid'],
      joins: ['wing', 'through', 'mirror'],
      plan: { pattern: 'grid', grid: { size: '6x3' } },
      render: aids({ hidden: true }),
    },
  },
  {
    id: 'carved',
    name: 'Carved blocks',
    blurb: 'One block, clean cuts',
    // cylinders still appear as cutters; the generator handles that
    apply: {
      style: 'clean',
      level: 5,
      allowed: ['cube'],
      joins: ['cut'],
      plan: ABOVE_45,
      render: aids({ hidden: true }),
    },
  },
  {
    id: 'freeform',
    name: 'Freeform',
    blurb: 'Anything goes',
    // level and joins don't apply to Freeform; these are what Clean uses if the style is switched later
    apply: {
      style: 'freeform',
      level: 3,
      allowed: [...PRIMITIVES],
      joins: [...JOINS],
      plan: { pattern: 'allAround', allAround: { count: 8 } },
      render: aids({}),
    },
  },
];

export const EXERCISE_IDS: ExerciseId[] = EXERCISES.map((e) => e.id);

export function exercise(id: ExerciseId): Exercise {
  return EXERCISES.find((e) => e.id === id)!;
}
