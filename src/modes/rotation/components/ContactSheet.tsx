import type { Shot } from '../../../views/types';
import { ShotTile } from './ShotTile';

interface Props {
  shots: Shot[];
  urls: ReadonlyMap<string, string>;
  kept: string[];
  activeShotId: string | null;
  onSnap: (shot: Shot) => void;
  onToggleKeep: (id: string) => void;
}

export function ContactSheet({ shots, urls, kept, activeShotId, onSnap, onToggleKeep }: Props) {
  return (
    <ul class="sheet" aria-label="Shots">
      {shots.map((shot) => (
        <ShotTile
          key={shot.id}
          shot={shot}
          url={urls.get(shot.id)}
          kept={kept.includes(shot.id)}
          active={shot.id === activeShotId}
          onSnap={onSnap}
          onToggleKeep={onToggleKeep}
        />
      ))}
    </ul>
  );
}
