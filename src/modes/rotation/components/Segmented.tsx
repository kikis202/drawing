import type { ComponentChildren } from 'preact';

interface Option<T> {
  value: T;
  label: ComponentChildren;
}

interface SegmentedProps<T> {
  /** The group's accessible name. */
  label: string;
  options: Option<T>[];
  value: T;
  /** Only called with a value other than the current one. */
  onChange: (value: T) => void;
}

/** One choice out of a few, as pressed buttons. Clicking the chosen one does nothing. */
export function Segmented<T>({ label, options, value, onChange }: SegmentedProps<T>) {
  return (
    <div class="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          aria-pressed={o.value === value}
          onClick={() => {
            if (o.value !== value) onChange(o.value);
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A labelled stack of controls in the panel. */
export function Field({ label, children }: { label?: string; children: ComponentChildren }) {
  return (
    <div class="field">
      {label && <span class="field-label">{label}</span>}
      {children}
    </div>
  );
}
