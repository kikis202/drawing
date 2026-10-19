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
  onHidden: (on: boolean) => void;
  onSave: () => void;
}

export function Controls({ settings, keptCount, onToggleShape, onHidden, onSave }: Props) {
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
