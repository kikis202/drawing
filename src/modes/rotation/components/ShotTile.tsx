import type { JSX } from 'preact';
import type { Shot } from '../../../views/types';
import { shotLabel } from '../../../views/label';

interface Props {
  shot: Shot;
  url: string | undefined;
  kept: boolean;
  active: boolean;
  /** Covered for "Hide one shot to test me" until revealed. */
  hidden: boolean;
  style?: JSX.CSSProperties;
  onSnap: (shot: Shot) => void;
  onToggleKeep: (id: string) => void;
  onReveal: () => void;
  onDownload: (shot: Shot) => void;
}

/** One print on the contact sheet: the button snaps the live view, the tick keeps the shot. */
export function ShotTile({ shot, url, kept, active, hidden, style, onSnap, onToggleKeep, onReveal, onDownload }: Props) {
  const label = shotLabel(shot);
  return (
    <li class={`shot${kept ? ' is-kept' : ''}${hidden ? ' is-hidden' : ''}`} style={style}>
      <button
        type="button"
        class="shot-snap"
        aria-current={active ? 'true' : undefined}
        onClick={() => onSnap(shot)}
      >
        {hidden ? (
          <span class="shot-cover">Draw this view: {label}</span>
        ) : (
          <>
            {url ? <img src={url} alt="" draggable={false} /> : <span class="shot-blank" />}
            <span class="shot-label">{label}</span>
          </>
        )}
      </button>
      {hidden && (
        <button type="button" class="btn btn-small shot-reveal" onClick={onReveal}>
          Reveal
        </button>
      )}
      {!hidden && (
        <button type="button" class="shot-download" aria-label={`Download ${label}`} onClick={() => onDownload(shot)}>
          <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
            <path
              d="M10 3v9m0 0l-3.5-3.5M10 12l3.5-3.5M4 16h12"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      )}
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
