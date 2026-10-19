import type { Shot } from '../../../views/types';
import { viewLabel } from '../../../views/label';

interface Props {
  shot: Shot;
  url: string | undefined;
  kept: boolean;
  active: boolean;
  onSnap: (shot: Shot) => void;
  onToggleKeep: (id: string) => void;
}

/** One print on the contact sheet: the button snaps the live view, the tick keeps the shot. */
export function ShotTile({ shot, url, kept, active, onSnap, onToggleKeep }: Props) {
  const label = viewLabel(shot.view);
  return (
    <li class={`shot${kept ? ' is-kept' : ''}`}>
      <button
        type="button"
        class="shot-snap"
        aria-current={active ? 'true' : undefined}
        onClick={() => onSnap(shot)}
      >
        {url ? <img src={url} alt="" draggable={false} /> : <span class="shot-blank" />}
        <span class="shot-label">{label}</span>
      </button>
      <input
        type="checkbox"
        class="shot-keep"
        aria-label={`Keep ${label}`}
        checked={kept}
        onChange={() => onToggleKeep(shot.id)}
      />
    </li>
  );
}
