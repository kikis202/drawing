import type { Lens } from '../views/camera';

export type RenderMode = 'shaded' | 'lines' | 'silhouette';

export interface RenderOptions {
  lens: Lens;
  hidden: boolean;
  box: boolean;
  centreLines: boolean;
  ground: boolean;
  mode: RenderMode;
}

export const DEFAULT_RENDER: RenderOptions = {
  lens: 'normal',
  hidden: false,
  box: false,
  centreLines: false,
  ground: false,
  mode: 'shaded',
};

const flag = (on: boolean) => (on ? 1 : 0);

/** Stable string identifying everything that changes a rendered image; used in cache keys. */
export function renderKey(o: RenderOptions): string {
  return `${o.lens}|h${flag(o.hidden)}|b${flag(o.box)}|c${flag(o.centreLines)}|g${flag(o.ground)}|${o.mode}`;
}
