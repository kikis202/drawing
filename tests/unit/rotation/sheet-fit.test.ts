import { describe, expect, it } from 'vitest';
import { fitColumns, fitSheet, GRID_MIN_TILE } from '../../../src/modes/rotation/sheet-fit';

describe('fitSheet', () => {
  it('lays 8 shots out in 4 columns in a desktop-sized area', () => {
    const fit = fitSheet(8, 1140, 845, 14);
    expect(fit.cols).toBe(4);
    expect(fit.tile).toBeGreaterThanOrEqual(240);
    // Both rows fit without scrolling.
    expect(2 * fit.tile + 14).toBeLessThanOrEqual(845);
  });

  it('puts 2 shots side by side', () => {
    expect(fitSheet(2, 1140, 845, 14).cols).toBe(2);
  });

  it('falls back to scrolling with tiles of at least 180px when the area is too small', () => {
    const fit = fitSheet(36, 600, 400, 14);
    expect(fit.tile).toBeGreaterThanOrEqual(180);
    expect(fit.cols).toBe(3);
    expect(fit.cols * fit.tile + (fit.cols - 1) * 14).toBeLessThanOrEqual(600);
  });

  it('never uses more columns than shots and always at least one', () => {
    expect(fitSheet(1, 2000, 300, 14).cols).toBe(1);
    expect(fitSheet(5, 100, 100, 14).cols).toBe(1);
  });

  it('gives whole-pixel tiles that never exceed the area', () => {
    for (const n of [2, 5, 8, 13, 24, 36]) {
      const { cols, tile } = fitSheet(n, 1001, 777, 14);
      expect(Number.isInteger(tile)).toBe(true);
      expect(cols * tile + (cols - 1) * 14).toBeLessThanOrEqual(1001);
    }
  });
});

describe('fitColumns', () => {
  it('keeps the forced column count and fits every row when tiles stay large', () => {
    const fit = fitColumns(2, 4, 1140, 845, 14);
    expect(fit.cols).toBe(4);
    expect(4 * fit.tile + 3 * 14).toBeLessThanOrEqual(1140);
    expect(2 * fit.tile + 14).toBeLessThanOrEqual(845);
  });

  it('fills the height when the width allows', () => {
    const fit = fitColumns(2, 4, 1140, 400, 14);
    expect(fit.cols).toBe(4);
    expect(fit.tile).toBe(193);
  });

  it('keeps tiles at 140px and lets the sheet scroll down when the rows do not fit', () => {
    const fit = fitColumns(5, 4, 1140, 400, 14);
    expect(fit.cols).toBe(4);
    expect(fit.tile).toBe(140);
  });

  it('keeps tiles at 140px and lets the sheet scroll sideways when the columns do not fit', () => {
    const fit = fitColumns(5, 8, 700, 600, 14);
    expect(fit.cols).toBe(8);
    expect(fit.tile).toBe(GRID_MIN_TILE);
    expect(8 * fit.tile + 7 * 14).toBeGreaterThan(700);
  });

  it('never goes under the 140px floor', () => {
    for (const [rows, cols, w, h] of [[3, 6, 1080, 810], [5, 8, 1080, 810], [5, 8, 900, 700], [6, 8, 500, 400]]) {
      const { tile } = fitColumns(rows, cols, w, h, 14);
      expect(Number.isInteger(tile)).toBe(true);
      expect(tile).toBeGreaterThanOrEqual(140);
    }
  });
});
