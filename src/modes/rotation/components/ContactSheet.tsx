import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import type { Shot } from '../../../views/types';
import { fitColumns, fitSheet, MIN_TILE } from '../sheet-fit';
import { ShotTile } from './ShotTile';

const GAP = 14;

interface Props {
  shots: Shot[];
  urls: ReadonlyMap<string, string>;
  kept: string[];
  activeShotId: string | null;
  /** The covered shot, if any. */
  hiddenShotId: string | null;
  /** Forces the column count (Grid); null lets the sheet pick. */
  columns?: number | null;
  /** The smallest tile before the free layout stops adding columns and scrolls. */
  minTile?: number;
  onSnap: (shot: Shot) => void;
  onToggleKeep: (id: string) => void;
  onReveal: () => void;
  onDownload: (shot: Shot) => void;
}

/**
 * Sizes the tiles so the shots fill the area as large as they can, scrolling only past the minimum size.
 * With `columns` set, a leading map shot takes a row of its own so the rows after it line up.
 */
export function ContactSheet({
  shots,
  urls,
  kept,
  activeShotId,
  hiddenShotId,
  columns = null,
  minTile = MIN_TILE,
  onSnap,
  onToggleKeep,
  onReveal,
  onDownload,
}: Props) {
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

  const ownRow = columns !== null && shots[0]?.role === 'map' ? 1 : 0;
  const rows = columns !== null ? ownRow + Math.ceil((shots.length - ownRow) / columns) : 0;
  const fit =
    area && area.w > 0
      ? columns !== null
        ? fitColumns(rows, columns, area.w, area.h, GAP)
        : fitSheet(shots.length, area.w, area.h, GAP, minTile)
      : null;

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
      {shots.map((shot, i) => (
        <ShotTile
          key={shot.id}
          shot={shot}
          url={urls.get(shot.id)}
          kept={kept.includes(shot.id)}
          active={shot.id === activeShotId}
          hidden={shot.id === hiddenShotId}
          style={ownRow && i === 1 ? { gridColumnStart: 1 } : undefined}
          onSnap={onSnap}
          onToggleKeep={onToggleKeep}
          onReveal={onReveal}
          onDownload={onDownload}
        />
      ))}
    </ul>
  );
}
