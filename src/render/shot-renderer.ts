import * as THREE from 'three';
import type { View } from '../views/types';
import type { FormScene } from './form-scene';
import type { RenderOptions } from './render-options';

/** Renders reference shots: square PNGs on white, via one offscreen WebGL canvas. */
export class ShotRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly sizePx: number;

  constructor(sizePx = 640) {
    this.sizePx = sizePx;
    this.canvas = document.createElement('canvas');
    this.canvas.width = sizePx;
    this.canvas.height = sizePx;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(sizePx, sizePx, false);
    this.renderer.setClearColor('#FFFFFF', 1);
  }

  render(form: FormScene, view: View, opts: RenderOptions): Promise<Blob> {
    form.setView(view, 1, this.sizePx, opts);
    form.setResolution(this.sizePx, this.sizePx);
    this.renderer.render(form.scene, form.camera);
    return new Promise((resolve, reject) => {
      this.canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('Shot encoding failed'))),
        'image/png',
      );
    });
  }

  dispose(): void {
    this.renderer.dispose();
  }
}
