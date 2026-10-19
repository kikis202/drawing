import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Shot } from '../../../views/types';
import { fitSheet } from '../sheet-fit';
import { ShotTile } from './ShotTile';

const GAP = 14;

interface Props {
  shots: Shot[];
  urls: ReadonlyMap<string, string>;
  kept: string[];
  activeShotId: string | null;
  onSnap: (shot: Shot) => void;
  onToggleKeep: (id: string) => void;
}

/** Sizes the tiles so the shots fill the area as large as they can, scrolling only past the minimum size. */
export function ContactSheet({ shots, urls, kept, activeShotId, onSnap, onToggleKeep }: Props) {
  const ref = useRef<HTMLUListElement>(null);
  const [area, setArea] = useState<{ w: number; h: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current!;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setArea((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fit = area && area.w > 0 ? fitSheet(shots.length, area.w, area.h, GAP) : null;

  return (
    <ul
      ref={ref}
      class="sheet"
      aria-label="Shots"
      style={{
        gap: `${GAP}px`,
        gridTemplateColumns: fit ? `repeat(${fit.cols}, ${fit.tile}px)` : undefined,
      }}
    >
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
