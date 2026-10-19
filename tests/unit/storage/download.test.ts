// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadBlob, zipFilename } from '../../../src/storage/download';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('download', () => {
  it('names the zip from the local date and time', () => {
    expect(zipFilename(new Date(2026, 9, 5, 7, 4))).toBe('turnaround-2026-10-05-0704.zip');
  });

  it('clicks a temporary link carrying the filename', () => {
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toBe('a.png');
      expect(this.href).toBe('blob:x');
    });
    downloadBlob(new Blob(['x']), 'a.png');
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
