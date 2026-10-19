/** Saves `blob` through a temporary link. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  // Give the browser a moment to start the download before the URL goes.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** `turnaround-YYYY-MM-DD-HHmm.zip`, in local time. */
export function zipFilename(now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `turnaround-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}.zip`;
}
