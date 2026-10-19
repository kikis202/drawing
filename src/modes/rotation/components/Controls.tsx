import { PRIMITIVES } from '../../../geometry/types';
import type { PrimitiveType } from '../../../geometry/types';
import type { Settings } from '../state';

const SHAPE_NAMES: Record<PrimitiveType, string> = {
  cube: 'Cube',
  sphere: 'Sphere',
  cylinder: 'Cylinder',
  cone: 'Cone',
  pyramid: 'Pyramid',
};

interface Props {
  settings: Settings;
  keptCount: number;
  onToggleShape: (type: PrimitiveType) => void;
  onPieces: (n: number) => void;
  onShotCount: (n: number) => void;
  onHidden: (on: boolean) => void;
  onSave: () => void;
}

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  fewer: string;
  more: string;
  onChange: (n: number) => void;
}

function Stepper({ label, value, min, max, fewer, more, onChange }: StepperProps) {
  return (
    <div class="control" role="group" aria-label={label}>
      <span class="control-label">{label}</span>
      <div class="stepper">
        <button type="button" aria-label={fewer} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output>{value}</output>
        <button type="button" aria-label={more} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </div>
    </div>
  );
}

export function Controls({ settings, keptCount, onToggleShape, onPieces, onShotCount, onHidden, onSave }: Props) {
  return (
    <div class="controls">
      <div class="control" role="group" aria-label="Shapes">
        <span class="control-label">Shapes</span>
        <div class="chips">
          {PRIMITIVES.map((type) => (
            <button
              type="button"
              class="chip"
              aria-pressed={settings.allowed.includes(type)}
              onClick={() => onToggleShape(type)}
            >
              {SHAPE_NAMES[type]}
            </button>
          ))}
        </div>
      </div>
      <div class="control-row">
        <Stepper
          label="Pieces"
          value={settings.pieces}
          min={1}
          max={6}
          fewer="Fewer pieces"
          more="More pieces"
          onChange={onPieces}
        />
        <Stepper
          label="Shots, evenly spaced"
          value={settings.shotCount}
          min={2}
          max={36}
          fewer="Fewer shots"
          more="More shots"
          onChange={onShotCount}
        />
      </div>
      <label class="toggle">
        <input type="checkbox" checked={settings.render.hidden} onChange={(e) => onHidden(e.currentTarget.checked)} />
        Hidden lines
        <span class="toggle-dash" aria-hidden="true" />
      </label>
      <button type="button" class="btn btn-primary save" disabled={keptCount === 0} onClick={onSave}>
        {keptCount === 1 ? 'Save 1 shot' : `Save ${keptCount} shots`}
      </button>
    </div>
  );
}
