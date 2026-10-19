import { EXERCISES } from '../exercises';
import type { ExerciseId } from '../exercises';

interface Props {
  /** The selected card; null once anything is customised. */
  selected: ExerciseId | null;
  /** Variation only works on a Clean form. */
  canVary: boolean;
  onApply: (id: ExerciseId) => void;
  onVariation: () => void;
  onNewObject: () => void;
}

/** The six preset cards, then Variation and New object. */
export function ExercisePanel({ selected, canVary, onApply, onVariation, onNewObject }: Props) {
  return (
    <section class="panel-sec" aria-labelledby="panel-exercise">
      <h2 id="panel-exercise" class="panel-title">
        Exercise
      </h2>
      <div class="presets">
        {EXERCISES.map((e) => (
          <button
            type="button"
            class="preset"
            aria-pressed={e.id === selected}
            onClick={() => {
              if (e.id !== selected) onApply(e.id);
            }}
          >
            <span class="preset-name">{e.name}</span>
            <span class="preset-blurb">{e.blurb}</span>
          </button>
        ))}
      </div>
      <div class="panel-actions">
        <button
          type="button"
          class="btn"
          disabled={!canVary}
          title={canVary ? undefined : 'Variation works with Clean forms'}
          onClick={onVariation}
        >
          Variation
        </button>
        <button type="button" class="btn btn-primary" onClick={onNewObject}>
          New object
        </button>
      </div>
    </section>
  );
}
