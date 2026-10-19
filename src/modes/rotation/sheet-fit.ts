export interface SheetFit {
  cols: number;
  /** Tile edge in whole CSS pixels. */
  tile: number;
}

export const MIN_TILE = 180;

/**
 * Picks the column count that makes `n` square tiles as large as possible inside a
 * width × height area with `gap` between them. If even the best fit makes tiles smaller
 * than `minTile`, it uses the most columns that keep tiles at least that big and lets
 * the sheet scroll.
 */
export function fitSheet(n: number, width: number, height: number, gap: number, minTile = MIN_TILE): SheetFit {
  const count = Math.max(1, n);
  const across = (c: number) => (width - (c - 1) * gap) / c;
  let best: SheetFit = { cols: 1, tile: -Infinity };
  for (let c = 1; c <= count; c++) {
    const rows = Math.ceil(count / c);
    const size = Math.min(across(c), (height - (rows - 1) * gap) / rows);
    if (size > best.tile) best = { cols: c, tile: size };
  }
  if (best.tile >= minTile) return { cols: best.cols, tile: Math.floor(best.tile) };

  const cols = Math.min(count, Math.max(1, Math.floor((width + gap) / (minTile + gap))));
  return { cols, tile: Math.max(0, Math.floor(across(cols))) };
}
