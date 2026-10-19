import { useState } from 'preact/hooks';
import { LEVELS, levelNote } from '../../../geometry/clean/generate-clean';
import type { Level } from '../../../geometry/clean/generate-clean';
import { JOINS } from '../../../geometry/types';
import type { FormStyle, JoinKind, PrimitiveType } from '../../../geometry/types';
import type { Lens } from '../../../views/camera';
import type { Settings } from '../state';
import { Field, Segmented } from './Segmented';

const SHAPE_NAMES: Record<PrimitiveType, string> = {
  cube: 'Box',
  cylinder: 'Cylinder',
  cone: 'Cone',
  pyramid: 'Pyramid',
  sphere: 'Sphere',
};

const JOIN_NAMES: Record<JoinKind, string> = {
  stack: 'Stack',
  totem: 'Totem',
  halfSunk: 'Half-sunk',
  wing: 'Wing (L / T)',
  through: 'Through',
  mirror: 'Mirror pair',
  hinged: 'Hinged lid',
  tilt45: '45° piece',
  cut: 'Clean cut',
};

const LEVEL_IDS: Level[] = [1, 2, 3, 4, 5, 6];

/** The lowest level that allows `join`. */
const fromLevel = (join: JoinKind) => LEVEL_IDS.find((l) => LEVELS[l].joins.includes(join))!;

/** Box first, as the exercises list shapes. */
const SHAPE_ORDER: PrimitiveType[] = ['cube', 'cylinder', 'cone', 'pyramid', 'sphere'];

interface Props {
  settings: Settings;
  /** Each is only called with a real change. */
  onStyle: (style: FormStyle) => void;
  onLevel: (level: Level) => void;
  onToggleShape: (type: PrimitiveType) => void;
  onToggleJoin: (join: JoinKind) => void;
  onLens: (lens: Lens) => void;
  onTopMap: (on: boolean) => void;
  onHideOne: (on: boolean) => void;
}

/** The fine controls behind a disclosure, collapsed until asked for. */
export function CustomisePanel({ settings, onStyle, onLevel, onToggleShape, onToggleJoin, onLens, onTopMap, onHideOne }: Props) {
  const [open, setOpen] = useState(false);
  const { style, level, allowed, joins, render, plan, hideOne } = settings;
  const note = levelNote({ level, allowed, joins });
  const allowedJoins = LEVELS[level].joins;

  return (
    <section class="panel-sec">
      <h2 class="panel-title">
        <button
          type="button"
          class="disclosure"
          aria-expanded={open}
          aria-controls="panel-customise"
          onClick={() => setOpen(!open)}
        >
          <svg viewBox="0 0 10 10" aria-hidden="true">
            <path d="M3.5 2 L7 5 L3.5 8" fill="none" stroke="currentColor" stroke-width="1.5" />
          </svg>
          Customise
        </button>
      </h2>
      <div id="panel-customise" class="customise" hidden={!open}>
        <div class="customise-next">
          <Field label="Style">
            <Segmented
              label="Style"
              value={style}
              options={[
                { value: 'clean', label: 'Clean' },
                { value: 'freeform', label: 'Freeform' },
              ]}
              onChange={onStyle}
            />
          </Field>
          <Field label="Level">
            <Segmented
              label="Level"
              value={level}
              options={LEVEL_IDS.map((l) => ({ value: l, label: String(l) }))}
              onChange={onLevel}
            />
            <span class="level-name">{LEVELS[level].name}</span>
            {note && <span class="panel-note">{note}</span>}
          </Field>
          <Field label="Shapes">
            <div class="chips" role="group" aria-label="Shapes">
              {SHAPE_ORDER.map((type) => {
                const on = allowed.includes(type);
                return (
                  <button
                    type="button"
                    class="chip"
                    aria-pressed={on}
                    onClick={() => {
                      // at least one shape always stays selected
                      if (!(on && allowed.length === 1)) onToggleShape(type);
                    }}
                  >
                    {SHAPE_NAMES[type]}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Joins">
            <div class="chips" role="group" aria-label="Joins">
              {JOINS.map((join) => {
                const usable = allowedJoins.includes(join);
                return (
                  <button
                    type="button"
                    class="chip"
                    aria-pressed={joins.includes(join)}
                    disabled={!usable}
                    onClick={() => onToggleJoin(join)}
                  >
                    {JOIN_NAMES[join]}
                    {!usable && <span class="chip-note"> from level {fromLevel(join)}</span>}
                  </button>
                );
              })}
            </div>
          </Field>
          <p class="panel-note">Applies to the next object</p>
        </div>
        <Field label="Lens">
          <Segmented
            label="Lens"
            value={render.lens}
            options={[
              { value: 'flat', label: 'Flat' },
              { value: 'normal', label: 'Normal' },
              { value: 'wide', label: 'Wide' },
            ]}
            onChange={onLens}
          />
        </Field>
        <div class="checks">
          <label class="check">
            <input type="checkbox" checked={plan.topMap} onChange={(e) => onTopMap(e.currentTarget.checked)} />
            Add a top-view map
          </label>
          <label class="check">
            <input type="checkbox" checked={hideOne} onChange={(e) => onHideOne(e.currentTarget.checked)} />
            Hide one shot to test me
          </label>
        </div>
      </div>
    </section>
  );
}
