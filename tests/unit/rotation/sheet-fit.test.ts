import { describe, expect, it } from 'vitest';
import { fitColumns, fitSheet } from '../../../src/modes/rotation/sheet-fit';

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

  it('scrolls rather than shrinking tiles under the minimum to fit the height', () => {
    const fit = fitColumns(5, 4, 1140, 400, 14);
    expect(fit.cols).toBe(4);
    expect(fit.tile).toBe(180);
  });

  it('never goes wider than the area, even below the minimum', () => {
    const fit = fitColumns(5, 8, 1080, 810, 14);
    expect(fit.cols).toBe(8);
    expect(Number.isInteger(fit.tile)).toBe(true);
    expect(8 * fit.tile + 7 * 14).toBeLessThanOrEqual(1080);
    expect(fit.tile).toBeGreaterThan(100);
  });
});
