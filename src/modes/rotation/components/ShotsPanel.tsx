import type { JSX } from 'preact';
import type { RenderOptions } from '../../../render/render-options';
import { planSummary } from '../../../views/patterns';
import type { PatternId, ShotPlan } from '../../../views/patterns';
import { Field, Segmented } from './Segmented';

const line = { fill: 'none', stroke: 'currentColor', 'stroke-width': 1.3 } as const;

/** Small diagrams of where each pattern puts the camera. */
const ICONS: Record<PatternId, JSX.Element> = {
  turntable: (
    <>
      <ellipse cx="17" cy="15" rx="13" ry="5" {...line} />
      <circle cx="4" cy="15" r="2" />
      <circle cx="17" cy="20" r="2" />
      <circle cx="30" cy="15" r="2" />
      <circle cx="17" cy="10" r="2" />
    </>
  ),
  grid: (
    <>
      {[4, 12, 20, 28].flatMap((x) => [6, 14, 22].map((y) => <circle cx={x} cy={y} r="2" />))}
    </>
  ),
  sequence: (
    <>
      <path d="M5 22 A14 14 0 0 1 29 22" {...line} />
      <path d="M29 22 l-4 -1 l3 -3z" />
      <circle cx="5" cy="22" r="2" />
      <circle cx="9" cy="13" r="2" />
      <circle cx="17" cy="8" r="2" />
      <circle cx="25" cy="13" r="2" />
    </>
  ),
  allAround: (
    <>
      <circle cx="17" cy="14" r="11" {...line} />
      <ellipse cx="17" cy="14" rx="11" ry="4" {...line} stroke-width={1} />
      <circle cx="17" cy="3" r="2" />
      <circle cx="6" cy="14" r="2" />
      <circle cx="28" cy="14" r="2" />
      <circle cx="17" cy="25" r="2" />
    </>
  ),
  orthographic: (
    <>
      <rect x="2" y="12" width="9" height="9" {...line} />
      <rect x="13" y="12" width="9" height="9" {...line} />
      <rect x="13" y="1" width="9" height="9" {...line} />
      <path d="M24 21 l4-4 h5 v-5 l-4 4z" {...line} stroke-width={1.1} />
    </>
  ),
};

const PATTERNS: { id: PatternId; name: string }[] = [
  { id: 'turntable', name: 'Turntable' },
  { id: 'grid', name: 'Grid' },
  { id: 'sequence', name: 'Sequence' },
  { id: 'allAround', name: 'All around' },
  { id: 'orthographic', name: 'Front, side, top' },
];

interface Props {
  plan: ShotPlan;
  render: RenderOptions;
  /** Only called with a real change. */
  onPlan: (patch: Partial<ShotPlan>) => void;
  onStartFromLive: () => void;
  onRender: (patch: Partial<RenderOptions>) => void;
}

/** The pattern picker, its settings and summary, and the Aids row. */
export function ShotsPanel({ plan, render, onPlan, onStartFromLive, onRender }: Props) {
  const aids: { name: string; on: boolean; patch: Partial<RenderOptions> }[] = [
    { name: 'Hidden lines', on: render.hidden, patch: { hidden: !render.hidden } },
    { name: 'Box', on: render.box, patch: { box: !render.box } },
    { name: 'Centre lines', on: render.centreLines, patch: { centreLines: !render.centreLines } },
    { name: 'Ground', on: render.ground, patch: { ground: !render.ground } },
    { name: 'Lines only', on: render.mode === 'lines', patch: { mode: render.mode === 'lines' ? 'shaded' : 'lines' } },
    {
      name: 'Silhouette',
      on: render.mode === 'silhouette',
      patch: { mode: render.mode === 'silhouette' ? 'shaded' : 'silhouette' },
    },
  ];

  return (
    <section class="panel-sec" aria-labelledby="panel-shots">
      <h2 id="panel-shots" class="panel-title">
        Shots
      </h2>
      <div class="pats" role="group" aria-label="Pattern">
        {PATTERNS.map((p) => (
          <button
            type="button"
            class="pat"
            aria-pressed={p.id === plan.pattern}
            onClick={() => {
              if (p.id !== plan.pattern) onPlan({ pattern: p.id });
            }}
          >
            <svg viewBox="0 0 34 28" fill="currentColor" aria-hidden="true">
              {ICONS[p.id]}
            </svg>
            {p.name}
          </button>
        ))}
      </div>
      <PatternSettings plan={plan} onPlan={onPlan} onStartFromLive={onStartFromLive} />
      <p class="panel-note" aria-live="polite">
        {planSummary(plan)}
      </p>
      <Field label="Aids">
        <div class="chips" role="group" aria-label="Aids">
          {aids.map((a) => (
            <button type="button" class="chip" aria-pressed={a.on} onClick={() => onRender(a.patch)}>
              {a.name}
            </button>
          ))}
        </div>
      </Field>
    </section>
  );
}

type SettingsProps = Pick<Props, 'plan' | 'onPlan' | 'onStartFromLive'>;

function PatternSettings({ plan, onPlan, onStartFromLive }: SettingsProps) {
  switch (plan.pattern) {
    case 'turntable': {
      const t = plan.turntable;
      return (
        <Field label="Step and tilt">
          <Segmented
            label="Step"
            value={t.step}
            options={[90, 45, 30].map((v) => ({ value: v as typeof t.step, label: `${v}°` }))}
            onChange={(step) => onPlan({ turntable: { ...t, step } })}
          />
          <Segmented
            label="Tilt"
            value={t.tilt}
            options={[
              { value: 'above', label: 'Above' },
              { value: 'level', label: 'Eye level' },
              { value: 'below', label: 'Below' },
            ] as const}
            onChange={(tilt) => onPlan({ turntable: { ...t, tilt } })}
          />
        </Field>
      );
    }
    case 'grid':
      return (
        <Field label="Turn steps × tilt rows">
          <Segmented
            label="Grid size"
            value={plan.grid.size}
            options={(['4x3', '6x3', '8x5'] as const).map((v) => ({ value: v, label: v.replace('x', ' × ') }))}
            onChange={(size) => onPlan({ grid: { size } })}
          />
        </Field>
      );
    case 'sequence': {
      const q = plan.sequence;
      return (
        <Field label="Around which axis, how far">
          <Segmented
            label="Axis"
            value={q.axis}
            options={[
              { value: 'vertical', label: 'Vertical' },
              { value: 'sideways', label: 'Side to side' },
            ] as const}
            onChange={(axis) => onPlan({ sequence: { ...q, axis } })}
          />
          <Segmented
            label="Steps"
            value={q.steps}
            options={(['4x15', '6x15', '4x30'] as const).map((v) => ({ value: v, label: `${v.replace('x', ' × ')}°` }))}
            onChange={(steps) => onPlan({ sequence: { ...q, steps } })}
          />
          <button type="button" class="btn btn-small" onClick={onStartFromLive}>
            Start from live view
          </button>
        </Field>
      );
    }
    case 'allAround':
      return (
        <Field label="How many">
          <Segmented
            label="How many"
            value={plan.allAround.count}
            options={([6, 8, 12, 24] as const).map((v) => ({ value: v, label: String(v) }))}
            onChange={(count) => onPlan({ allAround: { count } })}
          />
        </Field>
      );
    case 'orthographic':
      return null;
  }
}
